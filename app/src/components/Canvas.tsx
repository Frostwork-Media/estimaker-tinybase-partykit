import ReactFlow, {
  useReactFlow,
  Controls,
  SelectionMode,
  NodeTypes,
  Panel,
} from "reactflow";

import "reactflow/dist/style.css";
import { useRef } from "react";
import {
  useAddDerivativeNode,
  useAddEstimateNode,
  useDeleteNode,
  useMoveNode,
} from "../lib/tinybase-store";
import { useStore } from "tinybase/debug/ui-react";
import { useClientStore } from "../lib/useClientStore";
import { toNodesAndEdges } from "../lib/toNodesAndEdges";
import { EstimateNode } from "./graph/EstimateNode";
import { DerivativeNode } from "./graph/DerivativeNode";

const nodeTypes: NodeTypes = {
  estimate: EstimateNode,
  derivative: DerivativeNode,
};

export function Canvas({ nodes, edges }: ReturnType<typeof toNodesAndEdges>) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { project } = useReactFlow();

  const store = useStore();

  const addEstimateNode = useAddEstimateNode();
  const addDerivativeNode = useAddDerivativeNode();
  const moveNode = useMoveNode();
  const connectingNodeId = useRef<string | null>(null);
  const deleteNode = useDeleteNode();

  return (
    <div
      className="w-full h-screen mx-auto bg-slate-100"
      ref={reactFlowWrapper}
    >
      <ReactFlow
        fitView
        proOptions={{
          hideAttribution: true,
        }}
        nodeTypes={nodeTypes}
        nodes={nodes}
        edges={edges}
        zoomOnDoubleClick={false}
        selectionMode={SelectionMode.Partial}
        selectNodesOnDrag={false}
        nodesFocusable={false}
        selectionOnDrag={false}
        onNodesChange={(changes) => {
          for (const change of changes) {
            switch (change.type) {
              case "position": {
                if (change.position) {
                  moveNode({
                    id: change.id,
                    x: change.position.x,
                    y: change.position.y,
                  });
                }
                break;
              }
              case "select": {
                useClientStore.setState((state) => ({
                  ...state,
                  selectedNodes: change.selected
                    ? [change.id]
                    : state.selectedNodes.filter((id) => id !== change.id),
                }));
                break;
              }
              default: {
                // console.log("test", change);
              }
            }
          }
        }}
        onDoubleClick={(event) => {
          const targetIsPane =
            event.currentTarget.classList.contains("react-flow");
          if (!targetIsPane) return;

          if (!reactFlowWrapper.current) return;

          const { top, left } =
            reactFlowWrapper.current.getBoundingClientRect();

          addEstimateNode(
            project({ x: event.clientX - left, y: event.clientY - top })
          );
        }}
        onConnectStart={(_, { nodeId }) => {
          connectingNodeId.current = nodeId;
        }}
        onConnectEnd={(event) => {
          if (!store) return;

          if (!event.target) return;

          const targetIsPane = (event.target as HTMLElement).classList.contains(
            "react-flow__pane"
          );

          if (!targetIsPane) return;

          const sourceId = connectingNodeId.current;
          if (!sourceId) return;

          if (!reactFlowWrapper.current) return;
          const { top, left } =
            reactFlowWrapper.current.getBoundingClientRect();

          const initialContent =
            store.getCell("nodes", sourceId, "variableName")?.toString() || "";

          let x, y;

          if (event instanceof MouseEvent) {
            x = event.clientX - left;
            y = event.clientY - top;
          } else {
            const touch = event.touches[0];
            x = touch.clientX - left;
            y = touch.clientY - top;
          }

          addDerivativeNode({
            initialContent,
            ...project({ x, y }),
          });

          connectingNodeId.current = null;
        }}
        onNodesDelete={(nodes) => {
          for (const node of nodes) {
            deleteNode(node.id);
          }
          useClientStore.setState({ selectedNodes: [] });
        }}
      >
        <Panel position="top-left">
          <input
            type="text"
            placeholder="Search"
            className="border-b bg-transparent focus:outline-none focus:border-neutral-500 w-full"
          />
        </Panel>
        <Controls />
      </ReactFlow>
    </div>
  );
}
