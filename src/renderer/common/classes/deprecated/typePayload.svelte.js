import { PayloadTemplates } from "@shared/projectData/typePayloadTemplate";

export default class TypePayload {
  types = $state([]);
  type = $derived(this.types.join("."));
  payload = $state(null);
  #template = {};
  /**
   * @param {keyof typeof PayloadTemplates} name
   */
  constructor(name, { type = "", payload }, creatingOpt = null) {
    this.#template = PayloadTemplates[name];
    this.changeType(type, payload, false, creatingOpt);
  }
  getTemplateWithTypes(steps = this.types) {
    if (!steps.length) return this.#template;
    return steps.reduce((currentObj, currentStep) => currentObj[currentStep] ?? {}, this.#template);
  }
  get currentTemplate() {
    return this.getTemplateWithTypes();
  }
  genPayload(payload = {}, currentTemplate = this.currentTemplate, creatingOpt = null) {
    if (currentTemplate?.$types) return;

    if (!currentTemplate) return payload;
    // else if (currentTemplate.isClass)
    //     return new currentTemplate.class(payload, currentTemplate.argument ?? creatingOpt);
    return { ...currentTemplate, ...payload };
  }
  changeType(types = [], payload = {}, raw = false, creatingOpt = null) {
    this.types = [...types];

    if (raw) {
      this.payload = payload;
      return;
    }

    const currentTemplate = this.currentTemplate;
    if (currentTemplate?.$types) {
      this.payload = null;
      return;
    }

    this.payload = this.genPayload(payload, currentTemplate, creatingOpt);
  }
  get shortType() {
    return this.types.join(".");
  }
  get lastType() {
    return this.types[this.types.length - 1];
  }

  //#only editor
  get typeTree() {
    const tree = [Object.keys(this.#template)];
    this.types.reduce((currentObj, currentStep, i) => {
      const nextObj = currentObj[currentStep];
      if (nextObj?.$types) {
        const keys = Object.keys(nextObj);
        tree.push(keys.toSpliced(keys.indexOf("$types"), 1));
      }
      return nextObj;
    }, this.#template);
    return tree;
  }
  changeTypeWithHistory(addHistory, type, typeDepth = this.types.length) {
    const newTypes = [...this.types];
    newTypes.splice(typeDepth);
    newTypes.push(type);

    const tempTemplate = this.getTemplateWithTypes(newTypes);
    const newPayload = tempTemplate?.$types ? null : this.genPayload({}, tempTemplate);

    addHistory({
      doFn: ({ types, payload = {}, that }) => that.changeType(types, payload, true),
      doData: { types: newTypes, payload: newPayload, that: this },
      undoData: { types: this.types.map((t) => t), payload: this.payload, that: this }
    });
  }
  get storeData() {
    return {
      type: this.type,
      payload: $state.snapshot(this.payload)
    };
  }
  copyData(availableOuputIds = null) {
    return {
      type: this.type,
      payload: $state.snapshot(this.payload)
    };
  }
  // get outputs() {
  //     return this.payload?.outputs ?? this.payload?.output;
  // } //need migration
  //#endonly
}
