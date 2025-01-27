import { RangeSetBuilder } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, MatchDecorator, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { App } from 'obsidian';

import { getCodeblockPositions, isPositionInCodeblock } from './CodeblockHelper';
import { CLASS_ME_MENTION, CLASS_MENTION } from './Constants';
import { isFilePathInIgnoredDirectories } from './IgnoreHelper';
import { MentionSettings } from './Settings';

export interface CmDecorationExtensionConfig {
    regexp: RegExp;
    keyDownHandler: (lineNumber: number, posOnLine: number, path: string) => void;
    mouseDownHandler: (lineNumber: number, posOnLine: number, path: string) => void;
}

export function getCmDecorationExtension(app: App, cfg: CmDecorationExtensionConfig, settings: MentionSettings) {
    const viewPlugin = ViewPlugin.fromClass(
        class {
            decorator: MatchDecorator;
            decorations: DecorationSet;

            constructor(view: EditorView) {
                this.decorations = this.addDecorations(view);
            }

            update(update: ViewUpdate) {
                if (update.docChanged || update.viewportChanged) {
                    this.decorations = this.addDecorations(update.view);
                }
            }

            addDecorations(view: EditorView) {
                const rangeSetBuilder = new RangeSetBuilder<Decoration>();

                if (isFilePathInIgnoredDirectories(app.workspace.getActiveFile().path, settings)) return rangeSetBuilder.finish();

                const mentionRegexp = cfg.regexp;
                for (const { from, to } of view.visibleRanges) {
                    const range = view.state.sliceDoc(from, to);
                    let mentions = [...range.matchAll(mentionRegexp)];

                    const codeblockPositions: [from: number, to: number][] = getCodeblockPositions(range, from);
                    mentions = mentions.filter((mention) => !isPositionInCodeblock(codeblockPositions, from + mention.index));

                    mentions.forEach((m) => {
                        rangeSetBuilder.add(
                            from + m.index,
                            from + m.index + m[0].length,
                            Decoration.mark({
                                class: m[1] != null ? CLASS_ME_MENTION : m[2] != null ? CLASS_MENTION : '',
                            })
                        );
                    });
                }
                return rangeSetBuilder.finish();
            }

            destroy() {}
        },
        {
            decorations: (v) => v.decorations,

            eventHandlers: {
                keydown: (e, view) => {
                    if (e.code === 'Space' && e.ctrlKey) {
                        const pos = view.state.selection.asSingle().main.from;
                        const line = view.state.doc.lineAt(pos);
                        const posOnLine = pos - line.from;
                        const path = app.workspace.getActiveFile().path;

                        cfg.keyDownHandler(line.number, posOnLine, path);
                    }
                },
                mousedown: (e, view) => {
                    const target = e.target as HTMLElement;

                    if (e.ctrlKey) {
                        if (
                            target &&
                            ((e.target as HTMLElement).hasClass(CLASS_MENTION) || (e.target as HTMLElement).hasClass(CLASS_ME_MENTION))
                        ) {
                            const pos = view.posAtCoords({ x: e.x, y: e.y });
                            const clickLine = view.state.doc.lineAt(pos);
                            const clickPosOnLine = pos - clickLine.from;
                            const path = app.workspace.getActiveFile().path;

                            cfg.keyDownHandler(clickLine.number, clickPosOnLine, path);
                        }
                    }
                },
            },
        }
    );

    return viewPlugin;
}
