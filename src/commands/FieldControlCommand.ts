import * as vscode from 'vscode';

import Command from '../Command';

import { FieldControlPanel } from '../modules/field-control/fieldControl';
import { getExtensionUri } from '../extension';

/**
 * Opens the Path Generator
 * integrated into LemLib.
 * 
 * @author LemLib
 * @since 0.0.1
 * @version 0.0.1
 */
export default class FieldControlCommand extends Command {

    public async execute(...args: any[]): Promise<void> {
        // if (!checkIfPros()) return; not necessary, this can be ran outside of a PROS project.

        const uri: vscode.Uri | null = getExtensionUri();

        if (uri === null) {
            vscode.window.showErrorMessage('Cannot open the Field Controller: Failed to get extension URI.');
            return;
        }

        FieldControlPanel.createOrShow(uri);
    }
}

