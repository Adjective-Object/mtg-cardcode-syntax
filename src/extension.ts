import * as vscode from 'vscode';

function themeIndependentDecorartionFromRenderOptions(
    config: Record<string, vscode.ThemableDecorationRenderOptions>,
): Record<string, vscode.TextEditorDecorationType> {
    const toRet: Record<string, vscode.TextEditorDecorationType> = {};
    for (let k in config) {
        toRet[k] = vscode.window.createTextEditorDecorationType({
            dark: {
                ...config[k],
                color: config[k].color,
                backgroundColor: config[k].backgroundColor,
            },
            light: {
                ...config[k],
                color: config[k].backgroundColor,
                backgroundColor: config[k].color,
            },
        });
    }
    return toRet;
}

// this method is called when vs code is activated
export function activate(context: vscode.ExtensionContext) {
    let updateEditorTimeout: NodeJS.Timer | undefined = undefined;
    const colorKeywordRegexes = {
        W: /(white|(?<=[^\w^])W(?=[^\w]))/gim,
        U: /(blue|(?<=[^\w^])U(?=[^\w]))/gim,
        B: /(black|(?<=[^\w^])B(?=[^\w]))/gim,
        R: /(red|(?<=[^\w^])R(?=[^\w]))/gim,
        G: /(green|(?<=[^\w^])G(?=[^\w]))/gim,
    };
    const colorDecorationConfig = {
        W: {
            color: '#fffbd5',
        },
        U: {
            color: '#aae0fa',
        },
        B: {
            color: '#cec5c2',
        },
        R: {
            color: '#f9aa8f',
        },
        G: {
            color: '#9bd3ae',
        },
        A: {
            color: '#ccc2c0',
        },
        // Multicolor
        Z: {
            color: '#F2BC57',
            fontStyle: 'italic',
        },
        // Split Cards
        X: {
            color: '#F2780C',
            fontStyle: 'italic',
        },
        L: {
            color: '#d6b38f',
        },
    };
    const rarityDecorationConfig = {
        C: {
            backgroundColor: '#463f3f',
        },
        U: {
            color: '#999a9b',
        },
        R: {
            color: '#d9b768',
        },
        M: {
            color: '#e56d03',
        },
        L: { ...colorDecorationConfig.L },
        // Token
        T: {
            color: '#463f3f',
        },
        // Special (e.g. masterworks, timeshifted cards, etc)
        S: {
            color: '#b78fbd',
        },
    };
    const colorDecorations = themeIndependentDecorartionFromRenderOptions(
        colorDecorationConfig,
    );
    const rarityDecorations = themeIndependentDecorartionFromRenderOptions(
        rarityDecorationConfig,
    );

    let activeEditor = vscode.window.activeTextEditor;

    function updateDecorations() {
        if (!activeEditor) {
            return;
        }
        const lineRegex = /^(.)(.)?/gm;
        const text = activeEditor.document.getText();
        const recordedColorDecorations: Record<
            string,
            vscode.DecorationOptions[]
        > = {
            W: [],
            U: [],
            B: [],
            R: [],
            G: [],
            A: [],
            L: [],
            X: [],
            Z: [],
        };
        const recordedRarityDecorations: Record<
            string,
            vscode.DecorationOptions[]
        > = {
            C: [],
            U: [],
            R: [],
            M: [],
            T: [],
            S: [],
        };
        let match;
        while ((match = lineRegex.exec(text))) {
            console.log('match', match);
            const rarityCode = match[1];
            if (rarityCode && recordedRarityDecorations[rarityCode]) {
                recordedRarityDecorations[rarityCode].push({
                    range: new vscode.Range(
                        activeEditor.document.positionAt(match.index),
                        activeEditor.document.positionAt(match.index + 1),
                    ),
                });
            }
            const colorCode = match[2];
            if (colorCode && recordedColorDecorations[colorCode]) {
                recordedColorDecorations[colorCode].push({
                    range: new vscode.Range(
                        activeEditor.document.positionAt(match.index + 1),
                        activeEditor.document.positionAt(match.index + 2),
                    ),
                });
            }
        }
        // highlight these words as special
        for (let colorCode in colorKeywordRegexes) {
            const colorRegex =
                colorKeywordRegexes[colorCode as 'W' | 'U' | 'B' | 'R' | 'G'];
            while ((match = colorRegex.exec(text))) {
                recordedColorDecorations[colorCode].push({
                    range: new vscode.Range(
                        activeEditor.document.positionAt(match.index),
                        activeEditor.document.positionAt(
                            match.index + match[0].length,
                        ),
                    ),
                });
            }
        }
        for (let [k, v] of Object.entries(recordedColorDecorations)) {
            activeEditor.setDecorations(colorDecorations[k], v);
        }
        for (let [k, v] of Object.entries(recordedRarityDecorations)) {
            activeEditor.setDecorations(rarityDecorations[k], v);
        }
    }

    function triggerUpdateDecorations() {
        if (updateEditorTimeout) {
            clearTimeout(updateEditorTimeout);
            updateEditorTimeout = undefined;
        }
        updateEditorTimeout = setTimeout(updateDecorations, 200);
    }

    if (activeEditor) {
        triggerUpdateDecorations();
    }

    vscode.window.onDidChangeActiveTextEditor(
        editor => {
            activeEditor = editor;
            if (editor) {
                triggerUpdateDecorations();
            }
        },
        null,
        context.subscriptions,
    );

    vscode.workspace.onDidChangeTextDocument(
        event => {
            if (activeEditor && event.document === activeEditor.document) {
                triggerUpdateDecorations();
            }
        },
        null,
        context.subscriptions,
    );
}
