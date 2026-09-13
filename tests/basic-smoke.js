import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as Scripting from 'resource:///org/gnome/shell/ui/scripting.js';


export const METRICS = {};

const UUID = 'gnome-numbered-workspaces@kelvin.local';

Gio._promisify(
    Shell.Screenshot.prototype,
    'screenshot_area',
    'screenshot_area_finish'
);


function assert(condition, message) {
    if (!condition)
        throw new Error(message);
}


async function waitFor(condition, message) {
    for (let attempt = 0; attempt < 100; attempt++) {
        if (condition())
            return;
        await Scripting.sleep(100);
    }

    throw new Error(message);
}


async function capturePanel(path) {
    const stream = Gio.File.new_for_path(path).replace(
        null,
        false,
        Gio.FileCreateFlags.REPLACE_DESTINATION,
        null
    );
    await new Shell.Screenshot().screenshot_area(0, 0, 320, 64, stream);
    stream.close(null);
}


let testPromise = null;


async function smokeTest() {
    let indicator = null;
    await waitFor(() => {
        indicator = Main.panel.statusArea[UUID];
        return indicator !== undefined;
    }, 'Panel indicator was not registered');

    const activities = Main.panel.statusArea.activities;
    assert(!activities.visible, 'Built-in Activities indicator remained visible');
    activities.show();
    assert(!activities.visible, 'Built-in Activities indicator could reappear');

    assert(
        indicator._buttons.length === global.workspace_manager.n_workspaces,
        'Workspace button count does not match GNOME'
    );

    const mutterSettings = new Gio.Settings({schema_id: 'org.gnome.mutter'});
    const wmSettings = new Gio.Settings({
        schema_id: 'org.gnome.desktop.wm.preferences',
    });
    mutterSettings.set_boolean('dynamic-workspaces', false);
    wmSettings.set_int('num-workspaces', 3);
    await waitFor(
        () => global.workspace_manager.n_workspaces === 3 &&
            indicator._buttons.length === 3,
        'Workspace count did not update live'
    );

    assert(
        indicator.has_style_class_name('workspace-style-underline'),
        'Underline was not the default style'
    );
    indicator._settings.set_string('active-style', 'subtle-background');
    assert(
        indicator.has_style_class_name('workspace-style-subtle-background'),
        'Active style did not update live'
    );
    indicator._settings.set_string('active-style', 'underline');

    const targetIndex = 1;
    global.workspace_manager
        .get_workspace_by_index(targetIndex)
        .activate(global.get_current_time());
    await Scripting.waitLeisure();

    assert(
        indicator._buttons[targetIndex].has_style_class_name('workspace-button-active'),
        'Active workspace style did not update'
    );
    assert(
        indicator._underlines[targetIndex].height === 2,
        'Active underline was not allocated'
    );
    assert(
        indicator._underlines[targetIndex]
            .get_theme_node()
            .get_background_color().alpha > 0,
        'Active underline was transparent'
    );

    const firstButton = indicator._buttons[0];
    firstButton.emit('clicked', 1);
    await Scripting.waitLeisure();

    assert(
        global.workspace_manager.get_active_workspace_index() === 0,
        'Clicking a workspace number did not activate it'
    );

    const scrollUp = {
        get_scroll_direction: () => Clutter.ScrollDirection.UP,
    };
    const scrollDown = {
        get_scroll_direction: () => Clutter.ScrollDirection.DOWN,
    };

    indicator._onScroll(scrollUp);
    assert(
        global.workspace_manager.get_active_workspace_index() === 0,
        'Scrolling up wrapped before workspace 1'
    );
    indicator._onScroll(scrollDown);
    await Scripting.waitLeisure();
    assert(
        global.workspace_manager.get_active_workspace_index() === 1,
        'Scrolling down did not activate the next workspace'
    );

    wmSettings.set_int('num-workspaces', 5);
    await waitFor(
        () => global.workspace_manager.n_workspaces === 5 &&
            indicator._buttons.length === 5,
        'Five-workspace visual state did not appear'
    );
    global.workspace_manager
        .get_workspace_by_index(2)
        .activate(global.get_current_time());
    await Scripting.waitLeisure();
    await capturePanel('/tmp/gnome-numbered-workspaces-underline.png');

    indicator._settings.set_string('active-style', 'subtle-background');
    global.stage.queue_redraw();
    await Scripting.sleep(100);
    await capturePanel('/tmp/gnome-numbered-workspaces-subtle-background.png');
    indicator._settings.set_string('active-style', 'underline');

    assert(Main.extensionManager.disableExtension(UUID), 'Could not disable extension');
    await waitFor(
        () => Main.panel.statusArea[UUID] === undefined,
        'Panel indicator remained after disable'
    );
    assert(activities.visible, 'Built-in Activities indicator was not restored');
    assert(Main.extensionManager.enableExtension(UUID), 'Could not re-enable extension');
    await waitFor(
        () => Main.panel.statusArea[UUID] !== undefined,
        'Panel indicator did not return after enable'
    );
    assert(!activities.visible, 'Built-in Activities indicator returned after enable');
}


export function init() {
    testPromise = smokeTest();
    testPromise.then(
        () => Main.layoutManager.emit('startup-complete'),
        error => {
            logError(error, 'Basic extension smoke test failed');
            Meta.exit(Meta.ExitCode.ERROR);
        }
    );
}


export async function run() {
    await testPromise;
}
