// 콜백은 테스크 코드가 처리되자마자 돌아오는, 간극을 메워주는 통로다.
// 자바스크립트의 비동기성을 표현하는 일반적 기법이다. 하지만 단점이 많은 콜백을 해소시키기 위해 혜성처럼 등장한 프라미스를
// 콜백의 어떤 단점으로 추상화 시킨 기술인지 모른다면 활용가치는 그만큼 떨어진다.

// 1. 연속성
{
    // (1)
    ajax('...url', function () {
        // (2)   
    })
    // (3)
}
// 앞서 배워본 비동기성에서 지금 실행되는 부분과 나중에 실행되는 부분을 짚어봤었다.
// 지금과 나중사이의 간극, 비결정적인 시간 동안에 콜백을 이용하면 연속성을 부여할 수 있다.
// 콜백은 연속성을 감싼 캡슐화 장치다.

// 우리의 두뇌는 싱글 스레드, 이벤트 루프 큐처럼 작동한다. 즉, 재빠른 컨텍스트 스왑이 일어나 비동기 이벤트가 일어나는 것 같아보인다.
// 계획을 하는 단계와 작업을 수행하는 단계는 분명 차이가 있다. 일련의 계획을 하는 것이 우리로서 할 일인데(코드를 짜는 것)
// 계획 자체를 비동기적으로 짜는 것은 사실 리더블하지 못하다. 또 짜는 사람은 드물다.(없다고는 말하지 못하겠다)
// 즉, 동기적인 사고에 익숙한 두뇌에서 비동기 흐름을 생각하는 것이 부자연스럽다.

// 2. 콜백으로 이루어진 비동기 흐름을 이해하는 것은 숙련도에 어느정도 의존하겠지만, 더 심각한 애로사항이 있다.

// 2-1) 코드 널뛰기
{
    doA(function () {
        doB();

        doC(function () {
            doB();
        })

        doE();
    });

    doF()
}

// A -> F -> B -> C -> E -> D 로 수행된다. 코드를 넘겨짚어야하는 불편함이 있다.

// 2-3) 하드 코딩으로 지레 사전 계획하기 
{
    listen("click", handler);

    function handler() {
        setTimeout(request, 500);
    }

    function request() {
        ajax("http://some.url.1", response);
    }

    function response() {
        if (text == 'hello') handler();
        else if (text == 'bar') request();
    }
}
// 피라미드 모양의 콜백보다는 낫다. 하지만 취약한건 매한가지다.
// 하드 코딩은 먼저 유연하지못하다. 부실한 코드를 양산하기 좋고, 위 코드처럼 단계를 밟아가다가 예상치못한 에러에 대응할 수 없다. 그리고 조용히 프로그램은 죽는다. 
// 사태에 대한 것까지 사전 계획해버리면 코드는 너무 복잡해진다.

// 2-4) 믿음성 문제
{
    // A
    ajax("...url", function () {
        // C
    })
    // B
}

// 비동기 함수 유틸리티를 사용하면서 이루어지는 컨텍스트 교환은 서드파티에 그대로 의존하는 제어 역전의 문제가 도사린다.
// 1. 유틸리티에 넘겨주는 콜백을 부르지 않거나 시기가 맞지 않게 부른다거나하는 유틸리티 믿음성 문제
// 2. 콜백이 받는 값 (체킹/정규화)방어코드 작성으로 오버헤드 발생

// 3. 콜백의 이러한 문제들을 구할 패턴을 몇개 알아보자.
// 3-1) 분할 콜백
{
    function success(data) {
        console.log(data);
    }

    function failure(err) {
        console.error(err);
    }

    ajax('http://some.url.1', success, failure);
}
// 분할 콜백은 이후에 알아볼 프라미스 API 가 사용하는 패턴이다.

// 3-2) 에러 우선 처리
{
    function response(err, data) {
        if (err) {
            console.err(err);
        } else {
            console.log(data);
        }
    }

    ajax('http://some.url.1', response);
}
// 노드 스타일이라고 하는데 단일 콜백은 에러 객체를 첫 인자로 처리한다. 성공하면 falsy 한 객체로 채워진다.

// 두 콜백 해결 패턴은 어느정도 해결된 것 같지만 그렇지 않다. 
// 1. 여러번 콜백을 불러내 걸러내는 장치가 없다.
// 2. 성공과 에러 신호를 동시에 받거나 못받는 사태를 해결하지 못한다.
// 3. 관용 코드로 재사용이 불가능해 콜백을 일일히 코딩해야한다.
// 4. 콜백을 못 불러내 조용히 묻히는 상황을 대처 못한다.

// 3-3) 타임아웃 걸기
{
    function timeoutify(fn, delay) {
        var intv = setTimeout(function () {
            intv = null;

            fn(new Error('time out!'));
        }, delay)

        return function () {
            if (intv) {
                clearTimeout(intv);

                fn.apply(this, arguments)
            }
        }
    }

    // 사용
    function response(err, data) {
        if (err) {
            console.err(err);
        } else {
            console.log(data);
        }
    }

    ajax('http://some.url.1', timeoutify(response, 500));
}
// 콜백을 부르지 못했을 때 타임아웃을 거는 코드다. 콜백을 만약 너무 일찍 호출해 버린다면 어떻게 될까.
// 이렇게 콜백은 버그 지옥이다. 항상 이벤트 루프의 다음 대기자도 예측가능하게 비동기로 가야한다.
// API 가 항상 비동기로 작동할지 모르는 상황이라면 다음과 같은 코드로 작성할 수 있다.

// 3-4) 언제나 비동기
{
    function asyncify(fn) {
        var orig_fn = fn,
            intv = setTimeout(function () {
                intv = null;

                if (fn) fn();
            }, 0)

        fn = null;

        return function () {
            if (intv) {
                fn = orig_fn.bind.apply(
                    orig_fn,
                    [this].concat([].slice.call(arguments))
                );
            } else {
                orig_fn.apply(this, arguments)
            }
        }
    }

    // 사용
    function result(data) {
        console.log(a); // 항상 1 이다.
    }

    var a = 0;

    ajax("...url", asyncify(result));

    a++; // result 보다 먼저 실행
}
// 믿음성 문제를 해결한 것 같지만 이미 비대해진 관용코드일 뿐이다. 콜백은 이렇게 한계를 피해간다.