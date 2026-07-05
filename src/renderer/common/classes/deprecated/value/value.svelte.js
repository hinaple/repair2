export default class Value {
  baseType = $state();
  baseValue = $state();
  process = $state();
  constructor({ baseType = "string", baseValue = null, process = [] } = {}) {
    this.changeBaseType(baseType, baseValue);
    this.process = process;
  }
  changeBaseType(type, value = null) {
    this.baseType = type;
    this.baseValue = value;
  }
  /*
  get value() {
    return this.process.list.reduce(
      (result, process) => process.process(result), //need migration
      this.getBase()
    );
  }
  getBase() {
    return this.baseValue;
  }
  */

  //#only editor
  get storeData() {
    return {
      baseType: this.baseType,
      baseValue: this.baseValue,
      process: $state.snapshot(this.process)
    };
  }
  copyData(availableOuputIds = null) {
    return {
      baseType: this.baseType,
      baseValue: this.baseValue,
      process: $state.snapshot(this.process)
    };
  }
  //#endonly
}
