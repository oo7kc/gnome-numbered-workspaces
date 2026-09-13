import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';


const MIN_WORKSPACES = 1;
const MAX_WORKSPACES = 10;
const STYLES = ['underline', 'subtle-background'];


function clampWorkspaceCount(count) {
    return Math.min(MAX_WORKSPACES, Math.max(MIN_WORKSPACES, count));
}


export default class GnomeNumberedWorkspacesPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const extensionSettings = this.getSettings();
        const mutterSettings = new Gio.Settings({schema_id: 'org.gnome.mutter'});
        const wmSettings = new Gio.Settings({
            schema_id: 'org.gnome.desktop.wm.preferences',
        });

        const page = new Adw.PreferencesPage({
            title: 'General',
            icon_name: 'preferences-system-symbolic',
        });
        const group = new Adw.PreferencesGroup();

        const currentCount = clampWorkspaceCount(
            wmSettings.get_int('num-workspaces')
        );
        const countRow = new Adw.SpinRow({
            title: 'Workspace Count',
            subtitle: "Workspace count uses GNOME's fixed workspace mode.",
            adjustment: new Gtk.Adjustment({
                lower: MIN_WORKSPACES,
                upper: MAX_WORKSPACES,
                step_increment: 1,
                page_increment: 1,
                value: currentCount,
            }),
            digits: 0,
        });

        const styleNames = Gtk.StringList.new([
            'Underline',
            'Subtle Background',
        ]);
        const styleRow = new Adw.ComboRow({
            title: 'Active Indicator Style',
            model: styleNames,
            selected: Math.max(0, STYLES.indexOf(
                extensionSettings.get_string('active-style')
            )),
        });

        group.add(countRow);
        group.add(styleRow);
        page.add(group);
        window.add(page);
        window.set_default_size(480, 320);

        let syncingCount = false;
        const countRowSignal = countRow.connect('notify::value', () => {
            if (syncingCount)
                return;

            const count = Math.round(countRow.value);
            mutterSettings.set_boolean('dynamic-workspaces', false);
            wmSettings.set_int('num-workspaces', count);
        });
        const wmSettingsSignal = wmSettings.connect('changed::num-workspaces', () => {
            syncingCount = true;
            countRow.value = clampWorkspaceCount(
                wmSettings.get_int('num-workspaces')
            );
            syncingCount = false;
        });

        let syncingStyle = false;
        const styleRowSignal = styleRow.connect('notify::selected', () => {
            if (!syncingStyle)
                extensionSettings.set_string('active-style', STYLES[styleRow.selected]);
        });
        const extensionSettingsSignal = extensionSettings.connect(
            'changed::active-style', () => {
                syncingStyle = true;
                styleRow.selected = Math.max(0, STYLES.indexOf(
                    extensionSettings.get_string('active-style')
                ));
                syncingStyle = false;
            }
        );

        window.connect('close-request', () => {
            countRow.disconnect(countRowSignal);
            styleRow.disconnect(styleRowSignal);
            wmSettings.disconnect(wmSettingsSignal);
            extensionSettings.disconnect(extensionSettingsSignal);
            return false;
        });
    }
}
