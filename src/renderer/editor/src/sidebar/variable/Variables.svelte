<script lang="ts">
  import { Factories } from "../../project/factories";
  import { getMutator, getProject } from "../../project/store";
  import Variable from "./Variable.svelte";

  let currentEdit = $state<string | null>(null);
  function addVariable(event: MouseEvent) {
    event.stopPropagation();
    currentEdit = Factories.variable();
  }
  function remove(id: string) {
    getMutator().delete("variables", id);
    if (currentEdit === id) currentEdit = null;
  }
</script>

<div class="variables">
  <div class="list">
    {#each getProject().variables as [id] (id)}
      <Variable
        {id}
        isEditing={currentEdit === id}
        edit={(event) => {
          event.stopPropagation();
          currentEdit = id;
        }}
        blur={() => (currentEdit = null)}
        remove={() => remove(id)}
      />
    {/each}
  </div>
  <div class="add" onclick={addVariable}>변수 선언</div>
</div>

<style>
  .variables {
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 10px;
    overflow: hidden;
    padding-block: 5px 30px;
    align-items: center;
  }
  .list {
    width: 100%;
    flex: 1 1 auto;
    overflow-y: auto;
    padding-inline: 4px 0;
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
