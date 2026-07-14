<script lang="ts">
  import { createResource } from "@shared/projectData/factories";
  import { ipc } from "../../lib/ipc";
  import { getMutator, getProject } from "../../project/store";
  import Resource from "./Resource.svelte";
  import { AssetDir, selectMany, splitPath } from "./selectResourceFile";

  async function addResource(event: MouseEvent) {
    event.stopPropagation();
    const srcs = await selectMany();
    if (!srcs.length) return;
    const inAssets: string[] = [];
    let outAssets: string[] = [];
    srcs.forEach((src) =>
      src.includes(AssetDir) ? inAssets.push(splitPath(src)) : outAssets.push(src)
    );
    if (outAssets.length) {
      const result = await ipc.invoke("dialog", {
        type: "question",
        title: "다른 폴더의 파일이 있습니다.",
        message: `${outAssets.join("\n")}\n\n위 파일들을 자원 폴더에 복사하시겠습니까?`,
        buttons: ["자원 폴더에 복사", "건너뛰기"],
        cancelId: 1
      });
      outAssets = result.response === 0 ? await ipc.invoke("copyInfoAsset", outAssets) : [];
    }
    getMutator().transaction(() => {
      for (const src of [...inAssets, ...outAssets]) {
        const resource = createResource({ src });
        getMutator().add("resources", resource.id, resource);
      }
    });
  }
</script>

<div class="resources">
  <div class="list">
    {#each getProject().resources as [id] (id)}
      <Resource {id} remove={() => getMutator().delete("resources", id)} />
    {/each}
  </div>
  <div class="add" onclick={addResource}>자원 추가</div>
</div>

<style>
  .resources {
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 10px;
    overflow: hidden;
    padding-bottom: 30px;
    align-items: center;
  }
  .list {
    border-radius: 10px;
    width: 100%;
    flex: 1 1 auto;
    overflow-y: auto;
    padding: 5px 0 0 4px;
    scrollbar-gutter: stable;
    display: flex;
    flex-direction: column;
    gap: 5px;
    box-sizing: border-box;
  }
  .add {
    flex: 0 0 auto;
    width: calc(100% - 40px);
    background-color: #fff;
    color: #000;
    border-radius: 10px;
    padding: 10px;
    box-sizing: border-box;
    cursor: pointer;
    font-weight: 600;
    text-align: center;
    opacity: 0.8;
  }
  .add:hover {
    opacity: 1;
  }
</style>
