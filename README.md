# GNOME Numbered Workspaces

A small GNOME Shell 50 extension that replaces the built-in Activities workspace pill with compact numbered workspace buttons on the left side of the top panel. It supports click and scroll navigation, highlights the active workspace, and provides simple preferences for workspace count and indicator style.

## Install

Requires **GNOME Shell 50**. Download the `.shell-extension.zip` from the [latest release](https://github.com/oo7kc/gnome-numbered-workspaces/releases/latest). From the folder containing the download, run:

```sh
gnome-extensions install gnome-numbered-workspaces@kelvin.local.shell-extension.zip
```

Sign out and back in so GNOME Shell discovers the extension, then enable it:

```sh
gnome-extensions enable gnome-numbered-workspaces@kelvin.local
```

Open its preferences with:

```sh
gnome-extensions prefs gnome-numbered-workspaces@kelvin.local
```

For development, use this instead of installing the ZIP: from the project directory, run `glib-compile-schemas schemas`, then link the source directory:

```sh
mkdir -p "$HOME/.local/share/gnome-shell/extensions"
ln -s "$PWD" "$HOME/.local/share/gnome-shell/extensions/gnome-numbered-workspaces@kelvin.local"
```

Keep the source directory in place. JavaScript updates require signing out and back in on Wayland.

## Optional keyboard shortcuts

These are GNOME desktop settings and must be configured on each computer. The extension does not change shortcuts automatically.

- `Super+1` through `Super+9`: switch to workspace 1–9; `Super+0`: workspace 10.
- Add `Shift` to move the focused window to that workspace.
- A destination workspace must exist; shortcuts do not create workspaces.

The following replaces the corresponding GNOME workspace and favorite-app bindings. If you use Ubuntu Dock or Dash to Dock, first turn off its **Use keyboard shortcuts to activate apps** setting to free the number keys. On Ubuntu this is also available with:

```sh
gsettings set org.gnome.shell.extensions.dash-to-dock hot-keys false
```

Then configure the number keys:

```sh
for workspace in 1 2 3 4 5 6 7 8 9 10; do
    digit=$workspace
    if [ "$workspace" -eq 10 ]; then
        digit=0
    else
        gsettings set org.gnome.shell.keybindings "switch-to-application-$workspace" '[]'
    fi
    gsettings set org.gnome.desktop.wm.keybindings "switch-to-workspace-$workspace" "['<Super>$digit']"
    gsettings set org.gnome.desktop.wm.keybindings "move-to-workspace-$workspace" "['<Shift><Super>$digit']"
done
```

Shortcut changes take effect immediately and persist after disabling the extension.
