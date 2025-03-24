export const StepTypes = {
    delay: "딜레이",

    Component: "컴포넌트",
    create: "생성",
    remove: "제거",
    modify: "수정",
    clear: "전체 제거",
    "Component.create": "컴포넌트 생성",
    "Component.remove": "컴포넌트 제거",
    "Component.modify": "컴포넌트 수정",
    "Component.clear": "컴포넌트 전체 제거",

    Audio: "오디오",
    play: "재생",
    pause: "일시정지",
    resume: "재개",
    changeVolume: "음량 변경",
    "Audio.play": "오디오 재생",
    "Audio.pause": "오디오 일시정지",
    "Audio.resume": "오디오 재개",
    "Audio.changeVolume": "오디오 음량 변경",

    Preload: "프리로드",
    add: "추가",
    release: "해제",
    releaseAll: "모두 해제",
    "Preload.add": "프리로드 추가",
    "Preload.release": "프리로드 해제",
    "Preload.releaseAll": "프리로드 모두 해제",

    Communication: "통신",
    Serial: "시리얼 통신",
    Socket: "소켓 통신",
    "Communication.Serial": "시리얼 통신",
    "Communication.Socket": "소켓 통신",
    open: "시작",
    send: "전송",
    close: " 종료",
    connect: "연결",
    disconnect: "연결 종료",
    "Communication.Serial.open": "시리얼 통신 시작",
    "Communication.Serial.send": "시리얼 통신 전송",
    "Communication.Serial.close": "시리얼 통신 종료",
    "Communication.Socket.connect": "소켓 통신 연결",
    "Communication.Socket.send": "소켓 통신 전송",
    "Communication.Socket.disconnect": "소켓 통신 종료",

    Others: "기타",
    setVariable: "변수 값 설정",
    executePlugin: "플러그인 실행",
    eventEmit: "이벤트 발생",
    "Others.setVariable": "변수 값 설정",
    "Others.executePlugin": "플러그인 실행",
    "Others.eventEmit": "이벤트 발생"
};

export const ComponentModifyTypes = {
    visible: "표시 여부",
    unbreakable: "보호",
    zIndex: "Z축 위치",
    style: "스타일"
};
export const ComponentModifyInputData = {
    visible: { label: "표시 여부", type: "checkbox" },
    unbreakable: { label: "보호", type: "checkbox" },
    zIndex: { type: "number", placeholder: "값이 클수록 앞에 보임" },
    style: {
        type: "textarea",
        code: true,
        autoResizeOpt: { minHeight: 50 },
        placeholder: "inline CSS code"
    }
};

export const ValueProcessTypes = {
    replaceAll: "특정 문자열 변경",
    removeAll: "특정 문자열 삭제",
    trim: "앞뒤 공백 제거",
    replaceAllRegex: "정규표현식 기반 변경",
    toLowerCase: "소문자화",
    toUpperCase: "대문자화",
    length: "글자 개수",
    jsFunction: "함수"
};

export const BaseValueTypes = {
    string: "직접 입력",
    variable: "변수"
};

export const ComparisonOperatorTypes = {
    equals: "A와 B가 동일",
    includes: "A가 B를 포함",
    gt: "A > B",
    lt: "A < B",
    gte: "A >= B",
    lte: "A <= B",
    jsFunction: "함수"
    // scriptFile: "스크립트 파일"
};

export const ElementTypes = {
    empty: "빈 요소",
    image: "이미지",
    video: "영상",
    input: "입력",
    plugin: "플러그인"
};

export const ElementListenerTypes = {
    custom: "사용자 정의",
    click: "마우스 클릭",
    input: "값 입력",
    videoEnd: "영상 종료",
    keyPress: "키보드 누름",
    jsFunction: "함수",
    plugin: "플러그인"
};

export const EntryTypes = {
    startup: "프로그램 시작",
    event: "이벤트",

    Communication: "통신",
    serialData: "시리얼 데이터 수신",
    Socket: "소켓 통신",
    "Communication.serialData": "시리얼 데이터 수신",
    "Communication.Socket": "소켓 통신",
    ondata: "데이터 수신",
    connect: "연결",
    "Communication.Socket.ondata": "소켓 데이터 수신",
    "Communication.Socket.connect": "소켓 통신 연결"
};

export const InputAllowedTypes = {
    any: "모든 문자",
    english: "영문",
    number: "숫자",
    korean: "한글",
    regex: "정규표현식 직접 입력"
};
