import "./Webview/bootstrap.js";
import "./Webview/Utils/StringHelpers";
import React from "react";
import ReactDOM from "react-dom";
import App from "./Webview/Components/App";
import { InitializationParameters } from "./Webview/Types/VSCodeDelegationTypes";
import { ExtensionInteraction } from "./Webview/Utils/ExtensionInteraction";

ExtensionInteraction.initializeEnvironment((window as any).language).then((params: InitializationParameters) => {
    // if we are running in VS Code and have stored state, we can recover it from state
    // vsCodeSetState will allow for setting that state
    // saving and restoring state happens when the webview loses and regains focus
    const { state, vsCodeSetState } = params;

    ReactDOM.render(
        <React.StrictMode>
            <App state={state} vsCodeSetState={vsCodeSetState} />
        </React.StrictMode>,
        document.getElementById("root")
    );
});
