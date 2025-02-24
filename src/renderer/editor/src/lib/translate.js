export const StepTypes = {
    Delay: "딜레이",
    CreateComponent: "컴포넌트 생성",
    RemoveComponent: "컴포넌트 제거",
    ModifyComponent: "컴포넌트 수정",
    ClearComponent: "컴포넌트 전체 삭제",
    PlayAudio: "오디오 재생",
    PauseAudio: "오디오 일시정지",
    ResumeAudio: "오디오 재개",
    ModifyAudioChannel: "오디오 속성 변경"
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
    includes: "A가 B를 포함"
};
