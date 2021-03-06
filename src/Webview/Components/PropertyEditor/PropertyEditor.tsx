import { type } from "os";
import * as React from "react";
import Definitions from "../../Definitions/Definitions";
import { ParameterizeValueRequestFunction } from "../../Types/GraphTypes";
import { PropertyEditField } from "./PropertyEditField";
import { PropertyReadOnlyEditField } from "./PropertyReadonlyEditField";

interface IPropertyEditorProps {
    nodeTypeName: string;
    nodeProperties: any;
    readOnly: boolean;
    updateNodeName?: (oldName: string, newName: string) => void;
    requestParameterization?: ParameterizeValueRequestFunction;
}

export const PropertyEditor: React.FunctionComponent<IPropertyEditorProps> = (props) => {
    const { nodeProperties, readOnly = false, requestParameterization, updateNodeName, nodeTypeName } = props;

    const definition = Definitions.getNodeDefinition(nodeTypeName);

    if (!definition) {
        return null;
    }

    const propertyFields = [];

    for (const name in definition.properties) {
        const property = definition.properties[name];

        if (!property) continue;

        // skip the type field (already shown as dropdown by PropertyNestedObject)
        if (name === "@type" || name == "inputs") continue;

        const key = "property-" + name;
        const required = (definition.required && definition.required.includes(name)) as boolean;

        propertyFields.push(
            <div
                key={key}
                style={{
                    marginTop: 20
                }}
            >
                {readOnly ? (
                    <PropertyReadOnlyEditField name={name} property={property} nodeProperties={nodeProperties} />
                ) : (
                    <PropertyEditField
                        name={name}
                        property={property}
                        nodeProperties={nodeProperties}
                        required={required}
                        requestParameterization={requestParameterization}
                        updateNodeName={name === "name" ? updateNodeName : undefined}
                    />
                )}
            </div>
        );
    }

    return <>{propertyFields}</>;
};
