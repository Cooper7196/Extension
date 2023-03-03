import * as vscode from 'vscode';
import { SerialPort } from 'serialport';


export function getWebviewOptions(extensionUri: vscode.Uri): any {
    return {
        retainContextWhenHidden: true,
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
    };
}
export class FieldControlPanel {
    public static currentPanel: FieldControlPanel | undefined;

    public static readonly viewType = 'fieldControl';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];

    private controller: SerialPort | undefined;
    public static createOrShow(extensionUri: vscode.Uri) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (FieldControlPanel.currentPanel) {
            FieldControlPanel.currentPanel._panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(FieldControlPanel.viewType, 'LemLib Setup', column || vscode.ViewColumn.One, getWebviewOptions(extensionUri));

        FieldControlPanel.currentPanel = new FieldControlPanel(panel, extensionUri);
    }
    public static revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        FieldControlPanel.currentPanel = new FieldControlPanel(panel, extensionUri);
    }
    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._extensionUri = extensionUri;

        this._update();

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        this._panel.onDidChangeViewState(
            e => {
                if (this._panel.visible) this._update();
            },
            null,
            this._disposables
        );
        panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'connect':
                        if (this.controller === undefined) {
                            SerialPort.list().then((ports) => {
                                ports.forEach((port) => {
                                    if ((port as any).hasOwnProperty("friendlyName")) {
                                        if ((port as any).friendlyName.includes("VEX V5 Controller Port")) {
                                            console.log("Vex controller found at port: ", port.path);
                                            this.controller = new SerialPort({
                                                path: port.path, baudRate: 115200
                                            }).on("error", (error) => {
                                                console.log(error);
                                                vscode.window.showErrorMessage("Failed to connect to VEX V5 Controller");
                                                this.controller = undefined;
                                                return;
                                            }).on("open", () => {
                                                this._panel.webview.postMessage({ command: 'onConnected' });
                                                vscode.window.showInformationMessage("Connected to VEX V5 Controller");
                                            });
                                        }
                                    }
                                }, this);
                            });
                            return;
                        }
                        this._panel.webview.postMessage({ command: 'onConnected' });
                        vscode.window.showInformationMessage("Connected to VEX V5 Controller");
                        return;
                    case 'disconnect':
                        if (this.controller === undefined) return;
                        this.controller.close();
                        this.controller = undefined;
                        this._panel.webview.postMessage({ command: 'onDisconnected' });
                        vscode.window.showInformationMessage("Disconnected from VEX V5 Controller");
                        return;
                    case 'setMode':
                        if (this.controller === undefined) return;
                        switch (message.mode) {
                            case 'autonomous':
                                this.controller.write(new Uint8Array([201, 54, 184, 71, 88, 193, 5, 10, 0, 0, 0, 0, 146, 124]));
                                return;
                            case 'driver':
                                this.controller.write(new Uint8Array([201, 54, 184, 71, 88, 193, 5, 8, 0, 0, 0, 0, 214, 255]));
                                return;
                            case 'disabled':
                                console.log("Disabled");
                                this.controller.write(new Uint8Array([201, 54, 184, 71, 88, 193, 5, 11, 0, 0, 0, 0, 56, 45]));
                                return;
                        }
                        return;
                }
            },
            null,
            this._disposables
        );
    }
    public dispose() {
        FieldControlPanel.currentPanel = undefined;

        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) x.dispose();
        }
        this.controller?.close();
    }

    private _update() {
        const webview = this._panel.webview;

        this._updateForHtml(webview);
    }

    private _updateForHtml(webview: vscode.Webview) {
        this._panel.title = 'Field Controller';
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }
    private _getHtmlForWebview(webview: vscode.Webview) {
        const fs = require('fs');

        const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css'));
        const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css'));

        const mainCss = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'field-control', 'field-control.css'));

        const js = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'field-control', 'scripts', 'main.js'));

        const sevenSegmentFont = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'field-control', 'fonts', 'Digital-7 Mono 400.ttf'));
        const nonce = getNonce();

        return fs.readFileSync(vscode.Uri.joinPath(this._extensionUri, 'media', 'field-control', 'field-control.html').fsPath, 'utf8')
            .replace(/<!--HEADERS-->/g, `

<style>
@font-face {
  font-family:"Digital-7";
  src: url("${sevenSegmentFont}") format("truetype");
}
</style>

<link href="${styleResetUri}" rel="stylesheet" />
<link href="${styleVSCodeUri}" rel="stylesheet" />

<link href="${mainCss}" rel="stylesheet" />
`).replace(/<!--SCRIPTS-->/g, `<script nonce="${nonce}" src="${js}"></script>`);
    }
}

export function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    return text;
}