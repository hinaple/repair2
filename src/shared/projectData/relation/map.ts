import type { RecordKey, RecordValue } from "../../constants";
import type { Types } from "../types";

export enum TYPE {
  ID = 0,
  ID_ARRAY = 1
}

export enum KIND {
  OWN = 0,
  REF = 1
}

export type RelationRootKey = RecordKey | "config";
export type RelationRootData<K extends RelationRootKey> = K extends "config"
  ? Types.ProjectConfig
  : K extends RecordKey
    ? RecordValue<K>
    : never;

export type RelationLeaf = {
  $type: TYPE;
  $key: RecordKey;
  $kind: KIND;
};

export type RelationTree<T = unknown> = {
  [key: string]: RelationTree | RelationLeaf | RelationCaseMap | string | undefined;
  $dependsOn?: T extends object ? keyof T & string : string;
  $cases?: RelationCaseMap;
};

export type RelationCaseMap = Record<string, RelationTree>;

export type RelationMapType = {
  [K in RelationRootKey]?: RelationTree<RelationRootData<K>>;
};

const OUTPUT = {
  $type: TYPE.ID,
  $key: "nodes",
  $kind: KIND.REF
} satisfies RelationLeaf;
const PLUGIN = {
  $type: TYPE.ID,
  $key: "pluginPointers",
  $kind: KIND.REF
} satisfies RelationLeaf;
const VARIABLE = {
  $type: TYPE.ID,
  $key: "variables",
  $kind: KIND.REF
} satisfies RelationLeaf;
const RESOURCE = {
  $type: TYPE.ID,
  $key: "resources",
  $kind: KIND.REF
} satisfies RelationLeaf;

export function isRelationLeaf(value: unknown): value is RelationLeaf {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    "$type" in value &&
    "$key" in value
  );
}

export function isRelationTree(value: unknown): value is RelationTree {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    !isRelationLeaf(value)
  );
}

export const RelationMap = {
  config: {
    runtimePlugins: {
      $type: TYPE.ID_ARRAY,
      $key: "pluginPointers",
      $kind: KIND.REF
    }
  },
  nodes: {
    $dependsOn: "nodeType",
    $cases: {
      entry: {
        output: OUTPUT
      },
      sequence: {
        steps: {
          $type: TYPE.ID_ARRAY,
          $key: "steps",
          $kind: KIND.OWN
        },
        output: OUTPUT
      },
      branch: {
        valueA: {
          $type: TYPE.ID,
          $key: "values",
          $kind: KIND.OWN
        },
        valueB: {
          $type: TYPE.ID,
          $key: "values",
          $kind: KIND.OWN
        },
        trueOutput: OUTPUT,
        falseOutput: OUTPUT
      },
      variableSet: {
        value: {
          $type: TYPE.ID,
          $key: "values",
          $kind: KIND.OWN
        },
        variable: {
          $type: TYPE.ID,
          $key: "variables",
          $kind: KIND.REF
        },
        output: OUTPUT
      }
    }
  },
  components: {
    elements: {
      $type: TYPE.ID_ARRAY,
      $key: "elements",
      $kind: KIND.OWN
    },
    frame: PLUGIN,
    introTransition: {
      plugin: PLUGIN
    },
    outroTransition: {
      plugin: PLUGIN
    }
  },
  elements: {
    listeners: {
      $type: TYPE.ID_ARRAY,
      $key: "listeners",
      $kind: KIND.OWN
    },
    $dependsOn: "type",
    $cases: {
      input: {
        payload: {
          variableId: VARIABLE
        }
      },
      advancedInput: {
        payload: {
          variableId: VARIABLE
        }
      },
      image: {
        payload: {
          resourceId: RESOURCE
        }
      },
      video: {
        payload: {
          resourceId: RESOURCE
        }
      },
      plugin: {
        payload: {
          plugin: PLUGIN
        }
      }
    }
  },
  listeners: {
    output: OUTPUT,
    $dependsOn: "type",
    $cases: {
      plugin: {
        payload: {
          plugin: PLUGIN
        }
      }
    }
  },
  steps: {
    $dependsOn: "type",
    $cases: {
      "Component.create": {
        payload: {
          componentId: {
            $type: TYPE.ID,
            $key: "components",
            $kind: KIND.OWN
          }
        }
      },
      "Preload.add": {
        payload: {
          resourceArr: {
            $type: TYPE.ID_ARRAY,
            $key: "resources",
            $kind: KIND.REF
          }
        }
      },
      "Preload.release": {
        payload: {
          resourceArr: {
            $type: TYPE.ID_ARRAY,
            $key: "resources",
            $kind: KIND.REF
          }
        }
      },
      "Audio.play": {
        payload: {
          resourceId: RESOURCE
        }
      },
      "Others.setVariable": {
        payload: {
          variableId: VARIABLE
        }
      },
      "Others.executePlugin": {
        payload: {
          plugin: PLUGIN
        }
      }
    }
  },
  values: {
    $dependsOn: "baseType",
    $cases: {
      variable: {
        baseValue: VARIABLE
      }
    },
    process: {
      $type: TYPE.ID_ARRAY,
      $key: "valueProcesses",
      $kind: KIND.OWN
    }
  }
} as const satisfies RelationMapType;
