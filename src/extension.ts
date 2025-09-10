// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// 作成したJSONファイルをインポート
import * as libraryFunctions from './lmntal-library.json';

// 型定義で補完を効かせる（任意ですが推奨）
type LmnatalLibrary = {
    [key: string]: {
        signature: string;
        description: string;
    }
};

const lmntalLibrary: LmnatalLibrary = libraryFunctions;


// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "lmntal-hover-support" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	// const disposable = vscode.commands.registerCommand('lmntal-hover-support.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
	// 	vscode.window.showInformationMessage('Hello World from lmntal-hover-support!');
	// });

	// LMNtal言語ファイルに対してホバー機能を提供することを登録
    const hoverProvider = vscode.languages.registerHoverProvider('lmntal', {

        // provideHoverメソッド: ユーザーが単語にマウスホバーしたときに呼び出される
        provideHover(document, position, token) {
            
            // カーソル位置にある単語の範囲を取得
            const range = document.getWordRangeAtPosition(position, /[a-zA-Z0-9_.]+/);
            if (!range) {
                return;
            }
            
            // 範囲から単語（関数名）を取得
            const word = document.getText(range);

            // JSONデータの中から、取得した単語に一致する情報を探す
            const functionInfo = lmntalLibrary[word];

            // 情報が見つかった場合
            if (functionInfo) {
                // 表示する内容をMarkdown形式で作成
                const markdownString = new vscode.MarkdownString();
                markdownString.appendCodeblock(functionInfo.signature, 'lmntal'); // シグネチャをコードブロックで表示
                markdownString.appendMarkdown('\n---\n'); // 区切り線
                markdownString.appendMarkdown(functionInfo.description); // 説明文を表示

                // VS Codeに表示するためのHoverオブジェクトを返す
                return new vscode.Hover(markdownString);
            }

            // 見つからなければ何も返さない
            return null;
        }
    });

	context.subscriptions.push(hoverProvider);
}

// This method is called when your extension is deactivated
export function deactivate() {}
