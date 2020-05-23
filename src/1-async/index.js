// 비동기의 핵심: 지금 수행되는 부분과 나중에 수행되는 부분 사이의 관계

// 1. 지금으로서는 끝낼 수 없는 것(= 나중에 수행되는 부분)
{
    var data = ajax('http://some.url.1'); // 지금 요청하고, 나중에 응답받는다.

    console.log(data); // 응답을 담지 못했다.
}
// ajax() 의 요청과 응답 사이의 간극 동안 data 할당문은 기다리지 않는다.


// 2. 콜백으로 기다리기
{
    ajax("http://some.url.1", function myCallbackFunction(data) {
        console.log(data); // 응답
    })
}
// myCallbackFunction() 콜백에서 응답을 받도록 기다린다.

// 자바스크립트 엔진 / 이벤트 루프 참고

// 3. 공유 데이터가 있는 병렬 시스템
{
    var a = 20; // 공유 데이터

    // 스레드 1
    function foo() {
        a = a + 1;
    }

    // 스레드 2
    function bar() {
        a = a * 2;
    }

    // 병렬 실행
    ajax("http://some.url.1", foo);
    ajax("http://some.url.2", bar);
}
// 1. foo -> bar 의 결과값: 42
// 2. bar -> foo 의 결과값: 41
// 자바스크립트에서는 단일-스레드로, 스레드 간 데이터 공유 문제인 비결정성 수준은 문제가 되지않는다.
// 하지만 위 결과처럼 스레드 순서에 따라 결과값이 달리지므로 결정적이지도 않다.  

// 자바스크립트는 단일-스레드로 함수 내부의 코드는 원자적이다. 따라서 각 함수는 완전-실행으로 실행을 옮아간다.
// 실행문 자체 인터리빙이 발생하지 않는다. 자바스크립트에서 함수 순서에 따른 비결정성을 경합 조건 이라고 표현한다.

// 4. 프로세스 동시성에서의 비상호작용
{
    var res = [];

    function foo(results) {
        res.foo = results;
    }

    function bar(results) {
        res.bar = results;
    }

    ajax("http://some.url.1", foo);
    ajax("http://some.url.2", bar);
}
// foo(), bar() 프로세스가 서로에게 영향을 끼치지않는다. 따라서, 경합조건 버그가 나오지않는다.

// 5. 프로세스 동시성의 상호작용
{
    var res = [];

    function response(data) {
        res.push(data)
    }

    ajax("http://some.url.1", response);
    ajax("http://some.url.2", response);
}
// 두 프로세스는 같은 함수를 호출하므로 선발순으로 데이터가 처리된다. 따라서 결과는 뒤집힐 가능성이 충분하다.

// 6. 경합조건 해결하기 
// 6-1) 선택 제어하기
{
    var res = [];

    function response(data) {
        if (data.url == "http://some.url.1") {
            res[0] = data;
        }
        else if (data.url == "http://some.url.2") {
            res[1] = data;
        }
    }

    ajax("http://some.url.1", response);
    ajax("http://some.url.2", response);
}

// 6-2) Gate 사용하기
{
    var a, b;

    function foo(x) {
        a = x * 2;

        if (a && b) baz();
    }

    function bar(y) {
        b = y * 2;

        if (a && b) baz();
    }

    function baz() {
        console.log(a + b);
    }

    ajax("http://some.url.1", foo);
    ajax("http://some.url.2", bar);
}
// if (a && b) 조건으로 공유 baz() 호출을 제어했다. 관문은 두 값이 모두 있어야 열린다.

// 6-3) Latch 사용하기
{
    var a;

    function foo(x) {
        if (!a) {
            a = x * 2;

            baz();
        }
    }

    function bar(x) {
        if (!a) {
            a = x / 2;

            baz();
        }
    }

    function baz() {
        console.log(a);
    }

    ajax("http://some.url.1", foo);
    ajax("http://some.url.2", bar);
}
// 만약 Latch 장치가 없다면 함수를 두번 호출하고 결과를 덮어쓴다. Latch 는 선착순으로 값을 뽑아낸다.

// 6-4) 프로세스간 협동적 동시성
{
    var res = [];

    function response(data) {
        var chunk = data.splice(0, 1000);

        res = res.concat(
            chunk.map(function (val) {
                return val * 2;
            })
        )

        if (data.length > 0) {
            setTimeout(function () {
                response(data);
            }, 0);
        }
    }

    ajax("http://some.url.1", response);
    ajax("http://some.url.2", response);
}
// 아주 긴 데이터에 대해서 테스크 큐를 독점하지 않고 협동적 동시 시스템이 되려면 결과를 비동기 처리시키고 다른 테스크들과 동시성을 이뤄야한다.
// data.length 가 남은 경우 비동기 함수에 캐스팅시켜 이후 프로세스와 동시성을 이룬다. setTimeout() 은 비동기 스케줄링의 hacky 한 방법이다.

// *잡 큐