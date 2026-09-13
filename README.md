# GNOME Numbered Workspaces

A small GNOME Shell 50 extension that replaces the built-in Activities workspace pill with compact numbered workspace buttons on the left side of the top panel. It supports click and scroll navigation, highlights the active workspace, and provides simple preferences for workspace count and indicator style.

## Install

From the project directory, compile the settings schema and link the extension into your local GNOME extensions directory:

```sh
glib-compile-schemas schemas
mkdir -p "$HOME/.local/share/gnome-shell/extensions"
ln -s "$PWD" "$HOME/.local/share/gnome-shell/extensions/gnome-numbered-workspaces@kelvin.local"
```

Sign out and back in once so GNOME Shell discovers the new extension, then enable it:

```sh
gnome-extensions enable gnome-numbered-workspaces@kelvin.local
```

Open its preferences with:

```sh
gnome-extensions prefs gnome-numbered-workspaces@kelvin.local
```
