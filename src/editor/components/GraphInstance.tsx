import { ITextField, Stack, TextField } from "office-ui-fabric-react";
import * as React from "react";
import { useBoolean } from "@uifabric/react-hooks";
import {
    CanvasMouseMode,
    ICanvasData,
    IPropsAPI,
    isSupported,
    IZoomPanSettings,
    ReactDagEditor,
    RegisterNode,
    RegisterPort,
    withDefaultPortsPosition
} from "@vienna/react-dag-editor";
import { ExtensionInteraction } from "../../extension/extensionInteraction";
import Graph from "../../graph/Graph";
import Localizer from "../../localization/Localizer";
import { MediaGraphInstance } from "../../lva-sdk/lvaSDKtypes";
import { GraphInstanceParameter } from "../../types/graphTypes";
import { VSCodeSetState } from "../../types/vscodeDelegationTypes";
import * as Constants from "../../utils/Constants";
import { graphTheme as theme } from "../editorTheme";
import { ContextMenu } from "./ContextMenu";
import { InnerGraph } from "./InnerGraph";
import { NodeBase } from "./NodeBase";
import { ParameterPanel } from "./ParameterPanel";
import { modulePort } from "./Port";
import { Toolbar } from "./Toolbar";

interface IGraphInstanceProps {
    graph: Graph;
    zoomPanSettings: IZoomPanSettings;
    instance: MediaGraphInstance;
    vsCodeSetState: VSCodeSetState;
}

export const GraphInstance: React.FunctionComponent<IGraphInstanceProps> = (props) => {
    const { graph, instance } = props;
    const [data, setData] = React.useState<ICanvasData>(graph.getICanvasData());
    const [zoomPanSettings, setZoomPanSettings] = React.useState<IZoomPanSettings>(props.zoomPanSettings);
    const [graphInstanceName, setGraphInstanceName] = React.useState<string>(instance.name);
    const [graphDescription, setGraphDescription] = React.useState<string>((instance.properties && instance.properties.description) || "");
    const [graphNameError, setGraphNameError] = React.useState<string>("");
    const [sidebarIsShown, { toggle: setSidebarIsShown }] = useBoolean(true);

    let initialParams: GraphInstanceParameter[] = [];
    if (graph.getTopology().properties && graph.getTopology().properties!.parameters) {
        initialParams = graph.getTopology().properties!.parameters!.map((param) => {
            let value = param.default || "";
            if (instance.properties && instance.properties.parameters) {
                const matches = instance.properties.parameters.filter((parameter) => parameter.name === param.name);
                if (matches) {
                    value = matches[0].value;
                }
            }
            return {
                name: param.name,
                value,
                type: param.type,
                error: ""
            };
        });
    }
    const [parameters, setParametersInternal] = React.useState<GraphInstanceParameter[]>(initialParams);

    const propsApiRef = React.useRef<IPropsAPI>(null);
    const nameTextFieldRef = React.useRef<ITextField>(null);

    // save state in VS Code when data, zoomPanSettings, or parameters change
    const saveState = (update?: any) => {
        props.vsCodeSetState({
            pageViewType: Constants.PageType.graphPage,
            graphData: { ...data, meta: graph.getTopology() },
            zoomPanSettings,
            instance: generateInstance(),
            ...update // in case we want to force changes
        });
    };
    const setParameters = (parameters: GraphInstanceParameter[]) => {
        setParametersInternal(parameters);
        // the above might not update parameters immediately
        saveState({
            instance: generateInstance()
        });
    };
    React.useEffect(() => {
        saveState();
    }, [data, zoomPanSettings, graphInstanceName, graphDescription]);
    React.useEffect(() => {
        // on mount
        if (nameTextFieldRef) {
            nameTextFieldRef.current?.focus();
        }
    }, []);

    if (!isSupported()) {
        return <h1>{Localizer.l("browserNotSupported")}</h1>;
    }

    const generateInstance = (): MediaGraphInstance => {
        return {
            name: graphInstanceName,
            properties: {
                topologyName: graph.getName(),
                description: graphDescription,
                parameters: parameters.map((parameter) => ({
                    name: parameter.name,
                    value: parameter.value
                }))
            }
        };
    };

    const saveInstance = () => {
        if (canContinue()) {
            const vscode = ExtensionInteraction.getVSCode();
            if (vscode) {
                vscode.postMessage({
                    command: Constants.PostMessageNames.saveInstance,
                    text: generateInstance()
                });
            } else {
                // running in browser
                console.log(generateInstance());
            }
        }
    };
    const saveAndStartAction = {
        text: Localizer.l("saveAndStartButtonText"),
        callback: () => {
            if (canContinue()) {
                const vscode = ExtensionInteraction.getVSCode();
                if (vscode) {
                    vscode.postMessage({
                        command: Constants.PostMessageNames.saveAndActivate,
                        text: generateInstance()
                    });
                } else {
                    // running in browser
                    console.log(generateInstance());
                }
            }
        }
    };

    const validateName = (name: string) => {
        if (!name) {
            setGraphNameError(Localizer.l("sidebarGraphInstanceNameMissing"));
        } else {
            setGraphNameError("");
        }
    };
    const onNameChange = (event: React.FormEvent, newValue?: string) => {
        if (typeof newValue !== "undefined") {
            setGraphInstanceName(newValue);
            validateName(newValue);
        }
    };
    const onDescriptionChange = (event: React.FormEvent, newValue?: string) => {
        if (typeof newValue !== "undefined") {
            setGraphDescription(newValue);
        }
    };

    const canContinue = () => {
        validateName(graphInstanceName);
        const nameIsEmpty = graphInstanceName.length === 0;
        if (nameIsEmpty) {
            nameTextFieldRef.current!.focus();
        }
        let missingParameter = false;
        parameters.forEach((parameter, index) => {
            if (!parameter.value) {
                missingParameter = true;
                parameter.error = Localizer.l("sidebarGraphInstanceParameterMissing");
            }
        });
        setParameters(parameters);
        return !nameIsEmpty && !missingParameter;
    };

    const panelStyles = {
        root: {
            boxSizing: "border-box" as const,
            overflowY: "auto" as const,
            willChange: "transform",
            width: 300,
            borderRight: "1px solid var(--vscode-editorWidget-border)"
        }
    };
    const panelItemStyles = {
        padding: 10,
        paddingTop: 0
    };
    const topSidebarStyles = {
        padding: 10,
        borderBottom: "1px solid var(--vscode-editorWidget-border)",
        paddingBottom: 20,
        marginBottom: 10
    };

    return (
        <ReactDagEditor theme={theme}>
            <RegisterNode name="module" config={withDefaultPortsPosition(new NodeBase())} />
            <RegisterPort name="modulePort" config={modulePort} />
            <Stack styles={{ root: { height: "100vh" } }}>
                <Toolbar
                    name={graphInstanceName}
                    primaryAction={saveInstance}
                    secondaryAction={saveAndStartAction}
                    cancelAction={() => {
                        const vscode = ExtensionInteraction.getVSCode();
                        if (vscode) {
                            vscode.postMessage({
                                command: Constants.PostMessageNames.closeWindow
                            });
                        }
                    }}
                    toggleSidebar={setSidebarIsShown}
                    isSidebarShown={sidebarIsShown}
                />
                <Stack grow horizontal>
                    {sidebarIsShown && (
                        <Stack.Item styles={panelStyles}>
                            <div style={topSidebarStyles}>
                                <TextField
                                    label={Localizer.l("sidebarGraphInstanceNameLabel")}
                                    required
                                    value={graphInstanceName}
                                    placeholder={Localizer.l("sidebarGraphNamePlaceholder")}
                                    errorMessage={graphNameError}
                                    onChange={onNameChange}
                                    componentRef={nameTextFieldRef}
                                />
                                <TextField
                                    label={Localizer.l("sidebarGraphDescriptionLabel")}
                                    value={graphDescription}
                                    placeholder={Localizer.l("sidebarGraphDescriptionPlaceholder")}
                                    onChange={onDescriptionChange}
                                />
                            </div>
                            <div style={panelItemStyles}>
                                <ParameterPanel parameters={parameters} setParameters={setParameters} />
                            </div>
                        </Stack.Item>
                    )}
                    <Stack.Item grow>
                        <InnerGraph
                            data={data}
                            setData={setData}
                            zoomPanSettings={zoomPanSettings}
                            setZoomPanSettings={setZoomPanSettings}
                            canvasMouseMode={CanvasMouseMode.pan}
                            readOnly
                            propsApiRef={propsApiRef}
                        />
                    </Stack.Item>
                </Stack>
            </Stack>
            <ContextMenu />
        </ReactDagEditor>
    );
};