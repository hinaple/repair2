export class RemoveComponent {
    constructor({ componentAlias, ignoreUnbreakable = false } = {}) {
        this.componentAlias = componentAlias;
        this.ignoreUnbreakable = ignoreUnbreakable;
    }
}

export class ModifyComponent {
    constructor({ componentAlias, modifyKey, modifyValue } = {}) {
        this.componentAlias = componentAlias;
        this.modifyKey = modifyKey;
        this.modifyValue = modifyValue;
    }
}

export class ClearComponent {
    constructor({ ignoreUnbreakable = false } = {}) {
        this.ignoreUnbreakable = ignoreUnbreakable;
    }
}

export class PlayAudio {
    constructor({ resourceId, channel = "default" }) {
        this.resourceId = resourceId;
        this.channel = channel;
    }
}

export class PauseAudio {
    constructor({ channel = "default" }) {
        this.channel = channel;
    }
}
