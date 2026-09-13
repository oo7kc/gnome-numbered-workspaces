import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk';


const sourcePath = GLib.get_current_dir();

const resource = Gio.Resource.load(
    '/usr/share/gnome-shell/org.gnome.Shell.Extensions.src.gresource'
);
Gio.resources_register(resource);

const prefsUri = GLib.filename_to_uri(
    GLib.build_filenamev([sourcePath, 'prefs.js']),
    null
);
const {default: Preferences} = await import(prefsUri);

Gtk.init();
Adw.init();

const window = new Adw.PreferencesWindow();
const preferences = new Preferences({
    uuid: 'gnome-numbered-workspaces@kelvin.local',
    name: 'GNOME Numbered Workspaces',
    description: 'A minimal numbered workspace indicator for GNOME Shell.',
    'settings-schema': 'org.gnome.shell.extensions.gnome-numbered-workspaces',
    dir: Gio.File.new_for_path(sourcePath),
    path: sourcePath,
});

preferences.fillPreferencesWindow(window);
