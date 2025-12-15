import * as Hangul from "hangul-js";

const Eng = "rRseEfaqQtTdwWczxvgASDFGZXCVkoiOjpuPhynbmlYUIHJKLBNM";
const Kor =
    "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎㅁㄴㅇㄹㅎㅋㅌㅊㅍㅏㅐㅑㅒㅓㅔㅕㅖㅗㅛㅜㅠㅡㅣㅛㅕㅑㅗㅓㅏㅣㅠㅜㅡ";
function singleConvert(char) {
    if (Eng.includes(char)) return Kor[Eng.indexOf(char)];
    else return char;
}
function EngsToKoArr(arr) {
    return arr.map((c) => singleConvert(c));
}
export function enToKo(str) {
    const KoArr = EngsToKoArr(Hangul.disassemble(str));
    return Hangul.assemble(KoArr);
}
export function koToEn(str) {
    return Hangul.disassemble(str)
        .map((char) => (Kor.includes(char) ? Eng[Kor.indexOf(char)] : char))
        .join("");
}
