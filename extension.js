import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';


const WorkspaceIndicator = GObject.registerClass(
class WorkspaceIndicator extends PanelMenu.Button {
    _init(settings) {
        super._init(0.0, 'GNOME Numbered Workspaces', true);

        this.remove_style_class_name('panel-button');
        this.add_style_class_name('gnome-numbered-workspaces-panel');

        this._workspaceManager = global.workspace_manager;
        this._settings = settings;
        this._buttons = [];
        this._underlines = [];
        this._scrollAccumulator = 0;
        this._box = new St.BoxLayout({
            style_class: 'workspace-indicator',
            y_align: Clutter.ActorAlign.FILL,
        });
        this.add_child(this._box);

        this._workspaceCountSignal = this._workspaceManager.connect(
            'notify::n-workspaces', () => this._rebuild()
        );
        this._activeWorkspaceSignal = this._workspaceManager.connect(
            'active-workspace-changed', () => this._syncActiveWorkspace()
        );
        this._styleSignal = this._settings.connect(
            'changed::active-style', () => this._syncActiveStyle()
        );
        this._scrollSignal = this.connect(
            'scroll-event', (_actor, event) => this._onScroll(event)
        );

        this._syncActiveStyle();
        this._rebuild();
    }

    _rebuild() {
        this._box.destroy_all_children();
        this._buttons = [];
        this._underlines = [];

        for (let index = 0; index < this._workspaceManager.n_workspaces; index++) {
            const label = new St.Label({
                text: `${index + 1}`,
                style_class: 'workspace-number',
                y_align: Clutter.ActorAlign.CENTER,
            });
            const underline = new St.Widget({
                style_class: 'workspace-underline',
                x_align: Clutter.ActorAlign.CENTER,
            });
            const content = new St.BoxLayout({
                style_class: 'workspace-button-content',
                vertical: true,
                x_align: Clutter.ActorAlign.CENTER,
                y_align: Clutter.ActorAlign.CENTER,
            });
            content.add_child(label);
            content.add_child(underline);

            const button = new St.Button({
                style_class: 'workspace-button',
                child: content,
                reactive: true,
                track_hover: true,
                can_focus: true,
                accessible_name: `Workspace ${index + 1}`,
            });

            button.connect('clicked', () => {
                this._workspaceManager
                    .get_workspace_by_index(index)
                    ?.activate(global.get_current_time());
            });

            this._box.add_child(button);
            this._buttons.push(button);
            this._underlines.push(underline);
        }

        this._syncActiveWorkspace();
    }

    _syncActiveStyle() {
        this.remove_style_class_name('workspace-style-underline');
        this.remove_style_class_name('workspace-style-subtle-background');
        this.add_style_class_name(`workspace-style-${this._settings.get_string('active-style')}`);
    }

    _onScroll(event) {
        const direction = event.get_scroll_direction();

        if (direction === Clutter.ScrollDirection.UP) {
            this._scrollAccumulator = 0;
            this._activateRelative(-1);
        } else if (direction === Clutter.ScrollDirection.DOWN) {
            this._scrollAccumulator = 0;
            this._activateRelative(1);
        } else if (direction === Clutter.ScrollDirection.SMOOTH) {
            const [, deltaY] = event.get_scroll_delta();

            if (this._scrollAccumulator !== 0 &&
                Math.sign(deltaY) !== Math.sign(this._scrollAccumulator))
                this._scrollAccumulator = 0;

            this._scrollAccumulator += deltaY;
            if (Math.abs(this._scrollAccumulator) >= 1) {
                this._activateRelative(Math.sign(this._scrollAccumulator));
                this._scrollAccumulator -= Math.sign(this._scrollAccumulator);
            }
        } else {
            return Clutter.EVENT_PROPAGATE;
        }

        return Clutter.EVENT_STOP;
    }

    _activateRelative(offset) {
        const activeIndex = this._workspaceManager.get_active_workspace_index();
        const targetIndex = activeIndex + offset;

        if (targetIndex < 0 || targetIndex >= this._workspaceManager.n_workspaces)
            return;

        this._workspaceManager
            .get_workspace_by_index(targetIndex)
            .activate(global.get_current_time());
    }

    _syncActiveWorkspace() {
        const activeIndex = this._workspaceManager.get_active_workspace_index();

        for (let index = 0; index < this._buttons.length; index++) {
            if (index === activeIndex)
                this._buttons[index].add_style_class_name('workspace-button-active');
            else
                this._buttons[index].remove_style_class_name('workspace-button-active');
        }
    }

    destroy() {
        if (this._workspaceCountSignal) {
            this._workspaceManager.disconnect(this._workspaceCountSignal);
            this._workspaceCountSignal = 0;
        }

        if (this._activeWorkspaceSignal) {
            this._workspaceManager.disconnect(this._activeWorkspaceSignal);
            this._activeWorkspaceSignal = 0;
        }

        if (this._styleSignal) {
            this._settings.disconnect(this._styleSignal);
            this._styleSignal = 0;
        }

        if (this._scrollSignal) {
            this.disconnect(this._scrollSignal);
            this._scrollSignal = 0;
        }

        this._buttons = [];
        this._underlines = [];
        this._box = null;
        this._settings = null;
        this._workspaceManager = null;

        super.destroy();
    }
});


export default class GnomeNumberedWorkspacesExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._indicator = new WorkspaceIndicator(this._settings);
        Main.panel.addToStatusArea(this.uuid, this._indicator, 1, 'left');

        this._activities = Main.panel.statusArea.activities ?? null;
        if (this._activities) {
            this._activitiesWasVisible = this._activities.visible;
            this._activitiesVisibilitySignal = this._activities.connect(
                'notify::visible', () => {
                    if (this._activities?.visible)
                        this._activities.hide();
                }
            );
            this._activities.hide();
        }
    }

    disable() {
        this._indicator?.destroy();
        this._indicator = null;

        if (this._activities && this._activitiesVisibilitySignal) {
            this._activities.disconnect(this._activitiesVisibilitySignal);
            this._activitiesVisibilitySignal = 0;
        }

        if (this._activitiesWasVisible)
            this._activities?.show();

        this._activities = null;
        this._activitiesWasVisible = false;
        this._settings = null;
    }
}
