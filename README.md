# PowerCTL

**PowerCTL** is a CPU/GPU power profile manager for Linux that allows you to switch between performance, balanced, and power-saver profiles, control CPU boost, and set GPU modes using a modern Tauri-based GUI.

## Features

- Detect CPU model, CPU boost status, GPU mode, and current power profile
- Switch between power profiles (performance, balanced, power-saver) with one click
- Automatic power profile restoration at boot via systemd
- Helper scripts and polkit rules for passwordless GUI access

## Installation on Arch Linux / AUR

Clone the AUR repository:

```bash
git clone https://aur.archlinux.org/powerctl.git
cd powerctl
```

Build and install using yay:

```bash
yay -S powerctl
```

Run the post-install setup:

```bash
sudo /usr/local/bin/install-powerctl.sh
```

This will configure:
- Configuration file: `/etc/powerctl/config.conf`
- Helper scripts: `/usr/local/bin/powerctl-helper` and `powerctl-apply-boot`
- Systemd service: `powerctl-restore.service`
- Polkit rules for passwordless GUI execution

## Usage

Launch the GUI:

```bash
powerctl
```

From the GUI you can switch CPU/GPU profiles and view system stats and battery information automatically.

## Uninstallation

Disable the systemd service and remove configuration files:

```bash
sudo systemctl disable powerctl-restore.service
sudo rm -f /usr/local/bin/powerctl-helper /usr/local/bin/powerctl-apply-boot /usr/local/bin/install-powerctl.sh
sudo rm -rf /etc/powerctl
sudo rm -f /etc/systemd/system/powerctl-restore.service
sudo rm -f /etc/polkit-1/rules.d/50-powerctl.rules
```

Remove the AUR package:

```bash
sudo pacman -R powerctl
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.