<script>
    import InputField from "../InputField.svelte";
    import { EntryTypes } from "../../lib/translate";
    import { addHistory } from "../../lib/workHistory";
    import { getAllConnectedNodes, setAllOutput } from "../../nodes/lines/line";
    import { reload } from "../../lib/stores";

    const { data } = $props();
</script>

<InputField label="진입점 이름" value={data.alias} setter={(d) => (data.alias = d)} />
<InputField label="진입 유형" type="type" value={data.data} options={EntryTypes} />
<InputField
    label="항상 대기"
    value={!data.standbyMode}
    type="checkbox"
    manual
    setter={(d) => {
        if (!d) {
            addHistory({
                doFn: (v) => (data.standbyMode = v),
                doData: !d,
                undoData: !!d
            });
            return;
        }
        const connectedNodes = getAllConnectedNodes(data.id);
        console.log(data.id, connectedNodes);
        addHistory({
            doFn: ({ value, nodes }) => {
                data.standbyMode = value;
                setAllOutput(nodes, null);
                reload("nodeMoved");
            },
            undoFn: ({ value, nodes, targetEntryId }) => {
                data.standbyMode = value;
                setAllOutput(nodes, targetEntryId);
                reload("nodeMoved");
            },
            doData: { value: !d, nodes: connectedNodes },
            undoData: { value: !!d, nodes: connectedNodes, targetEntryId: data.id }
        });
    }}
/>
{#if data.data.type === "event"}
    <InputField
        label="이벤트 채널"
        value={data.data.payload.channel}
        setter={(d) => (data.data.payload.channel = d)}
    />
{:else if data.data.type === "shortcut"}
    <hr />
    <InputField
        label="감지할 키보드 버튼"
        value={data.data.payload.key}
        setter={(d) => (data.data.payload.key = d)}
    />
    <InputField
        label="Ctrl 눌러야 감지"
        value={data.data.payload.ctrlKey}
        type="checkbox"
        setter={(d) => (data.data.payload.ctrlKey = d)}
    />
    <InputField
        label="Shift 눌러야 감지"
        value={data.data.payload.shiftKey}
        type="checkbox"
        setter={(d) => (data.data.payload.shiftKey = d)}
    />
    <InputField
        label="감지 시간(초)"
        value={data.data.payload.pressingTime}
        type="number"
        setter={(d) => (data.data.payload.pressingTime = d)}
    />
{:else if data.data.type === "Communication.Socket.ondata"}
    <InputField
        label="수신 채널"
        value={data.data.payload.channel}
        setter={(d) => (data.data.payload.channel = d)}
    />
    <InputField
        label="일치 시 작동할 데이터"
        value={data.data.payload.data}
        setter={(d) => {
            data.data.payload.data = d;
        }}
        placeholder="항상 작동"
    />
{:else if data.data.type === "Communication.serialData"}
    <InputField
        label="수신 데이터"
        value={data.data.payload.whenDataIs}
        setter={(d) => (data.data.payload.whenDataIs = d)}
        placeholder="모든 데이터 수신"
    />
{/if}
