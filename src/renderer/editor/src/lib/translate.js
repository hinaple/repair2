export const StepTypes = {
    delay: "딜레이",

    Component: "컴포넌트",
    create: "생성",
    remove: "제거",
    modify: "수정",
    clear: "전체 삭제",
    "Component.create": "컴포넌트 생성",
    "Component.remove": "컴포넌트 제거",
    "Component.modify": "컴포넌트 수정",
    "Component.clear": "컴포넌트 전체 삭제",

    Audio: "오디오",
    play: "재생",
    pause: "일시정지",
    resume: "재개",
    modifyChannel: "속성 변경",
    "Audio.play": "오디오 재생",
    "Audio.pause": "오디오 일시정지",
    "Audio.resume": "오디오 재개",
    "Audio.modifyChannel": "오디오 속성 변경"
};

export const ValueProcessTypes = {
    replaceAll: "특정 문자열 변경",
    removeAll: "특정 문자열 삭제",
    trim: "앞뒤 공백 제거",
    replaceAllRegex: "정규표현식 기반 변경",
    toLowerCase: "소문자화",
    toUpperCase: "대문자화"
};

export const BaseValueTypes = {
    string: "직접 입력",
    variable: "변수"
};

export const ComparisonOperatorTypes = {
    equals: "A와 B가 동일",
    includes: "A가 B를 포함",
    script: "스크립트"
};

export const ElementTypes = {
    empty: "빈 요소",
    image: "이미지",
    video: "영상",
    input: "입력",
    plugin: "플러그인"
};

export const ElementListenerTypes = {
    nothing: "발동하지 않음",
    click: "마우스 클릭",
    videoEnd: "영상 종료",
    keyPress: "키보드 입력"
};

export const EntryTypes = {
    startup: "프로그램 시작",
    event: "이벤트"
};

export const InputAllowedTypes = {
    english: "영문",
    number: "숫자",
    korean: "한글",
    regex: "정규표현식 직접 입력"
};
