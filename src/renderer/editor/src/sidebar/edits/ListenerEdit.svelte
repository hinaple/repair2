<script>
    import InputField from "../InputField.svelte";
    import { ElementListenerTypes } from "../../lib/translate";

    const { data } = $props();
</script>

<InputField label="리스너 종류" type="type" value={data} options={ElementListenerTypes} />
