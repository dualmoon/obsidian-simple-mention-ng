import { MentionSettings } from './Settings';

export function isFilePathInIgnoredDirectories(filePath: string, settings: MentionSettings): boolean {
    const isDirectoryInPath = function isDirectoryInPath(directory: string, path: string): boolean {
        return directory.trim() != '' && path.startsWith(directory.trim());
    };

    for (const ignoredDirectory of settings.ignoredDirectories.split(',')) {
        if (isDirectoryInPath(ignoredDirectory, filePath)) {
            return true;
        }
    }

    return false;
}
