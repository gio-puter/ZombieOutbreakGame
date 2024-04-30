import React from "react";

function MaxLengthTextField(props) {

    function charactersLeft() {
        if (props.showCharCount) {
            return props.maxLength - props.value.length;
        } else {
            return ""
        }
    }

    function handleChange(event) {
        let text = event.target.value
        text = text.replace(/\s\s+/g, ' ')
        while (text.charAt(0) === ' ' || text.charAt(0) === '\t') {
            text = text.substr(1)
        }
        if (text.length > props.maxLength && props.maxLength !== -1) {
            text = text.substr(0, props.maxLength)
        }
        if (props.forceUpperCase) {
            props.onChange(text.toUpperCase())
        } else {
            props.onChange(text)
        }
    }

    return (
        <div>
            <label>
                <div>
                    <p>{props.label}</p>
                    <p>{charactersLeft()}</p>
                </div>
                <input  className="MaxLengthTextField"
                        value={props.value}
                        onChange={handleChange}
                        placeholder={props.placeholder}
                        autoComplete={"off"}
                >
                </input>
            </label>
        </div>
    )
}

MaxLengthTextField.defaultProps = {
    maxLength: 12,
    label: "",
    placeholder: "",
    showCharCount: true,
    forceUpperCase: false,
    value: "",
}

export default MaxLengthTextField