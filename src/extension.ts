// VS Code の拡張 API
import * as vscode from 'vscode';

// ライブラリ定義の JSON を読み込む
import * as libraryFunctions from './lmntal-library.json';

// 型定義（補完用）
type LmnatalLibrary = {
    [key: string]: {
        signature: string;
        description: string;
    }
};

const lmntalLibrary: LmnatalLibrary = libraryFunctions;

// ユーザー定義アトムの情報を格納するオブジェクト
// キー: アトム名 (例: 'my_atom')
// 値: アトムの詳細情報 (例: { kind: 'atom', location: ... })
const userDefinedSymbols = new Map<string, vscode.SymbolInformation>();


// 拡張機能が有効化されたときに呼ばれる
export function activate(context: vscode.ExtensionContext) {

    console.log('lmntal-support が有効化されました。');

    // ホバー情報の登録
    const hoverProvider = vscode.languages.registerHoverProvider('lmntal', {

        // provideHoverメソッド: ユーザーが単語にマウスホバーしたときに呼び出される
        provideHover(document, position, token) {

            // カーソル位置の単語を取得
            const wordPattern = /[a-zA-Z0-9_.]+/;
            const range = document.getWordRangeAtPosition(position, wordPattern);
            if (!range) {
                return;
            }

            const word = document.getText(range);

            // 1. まずライブラリ関数を検索して、JSONデータの中から、取得した単語に一致する情報を探す
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

            // 2. ライブラリになければ、ユーザー定義アトムを検索
            const symbolInfo = userDefinedSymbols.get(word);
            if (symbolInfo) {
                const markdownString = new vscode.MarkdownString();
                const line = symbolInfo.location.range.start.line + 1; // 行番号は0から始まるため+1

                markdownString.appendMarkdown(`**ユーザー定義アトム**`);
                markdownString.appendMarkdown(`\n\n`);
                markdownString.appendMarkdown(`*${document.fileName}* の ${line}行目で定義されています。`);
                
                return new vscode.Hover(markdownString, range);
            }

            // 見つからなければ何も返さない
            return null;
        }
    });

    context.subscriptions.push(hoverProvider);

    // 補完プロバイダーの登録
    const provider = vscode.languages.registerCompletionItemProvider('lmntal', {

        provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {

            // 1. 現在のファイルから全てのテキストを取得
            const text = document.getText();

            // 2. 正規表現で単語を抽出
            // LMNtalのAtomNameやLinkNameに合致しそうなパターン
            // 例: 英数字とアンダースコアが続く単語
            const wordPattern = /[a-zA-Z0-9_]*/g;

            // 候補リストを作成
            const words = text.match(wordPattern);

            // 3.1 単語が見つからなければ空のリストを返す
            if (!words) {
                return [];
            }

            // 3.2 Setを使って重複を排除し、その後配列に戻す
            const uniqueWords = [...new Set(words)];

            // 4. VSCodeが要求するCompletionItemの形式に変換
            const completionItems = uniqueWords.map(word => {
                const item = new vscode.CompletionItem(word, vscode.CompletionItemKind.Text);
                return item;
            });

            return completionItems;
        }
    });

    context.subscriptions.push(provider);

    // 拡張機能が起動したときに、現在アクティブなエディタがあれば解析
    if (vscode.window.activeTextEditor) {
        updateUserDefinedSymbols(vscode.window.activeTextEditor.document);
    }

    // エディタ切替時とドキュメント変更時に解析を再実行
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor) {
                updateUserDefinedSymbols(editor.document);
            }
        })
    );

    // ドキュメントが変更（保存など）されたときに解析
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(event => {
            if (vscode.window.activeTextEditor && vscode.window.activeTextEditor.document === event.document) {
                updateUserDefinedSymbols(event.document);
            }
        })
    );
}

// This method is called when your extension is deactivated
export function deactivate() {}

/**
 * ドキュメントを解析して、ユーザー定義のアトム（シンボル）情報を収集する
 * @param document 解析対象のVS Codeドキュメント
 */
function updateUserDefinedSymbols(document: vscode.TextDocument) {
    // 古い情報をクリア
    userDefinedSymbols.clear();

    // 例： 'atom_name(A, B)' や 'atom_name' のような定義にマッチする正規表現
    // 実際のLMNtalの構文に合わせて調整が必要です
    const ruleHeadPattern = /^([a-z_][\w\.]*)\s*(\(.*\))?\s*:-/gm;

    const text = document.getText();
    let match;
    while ((match = ruleHeadPattern.exec(text)) !== null) {
        const atomName = match[1]; // マッチした部分からアトム名を取得
        const position = document.positionAt(match.index);
        const location = new vscode.Location(document.uri, position);

        // SymbolInformationオブジェクトを作成してMapに保存
        const symbolInfo = new vscode.SymbolInformation(
            atomName,
            vscode.SymbolKind.Function, // '関数' として分類（適宜変更）
            '', // コンテナ名（今回はなし）
            location
        );
        userDefinedSymbols.set(atomName, symbolInfo);
    }
}