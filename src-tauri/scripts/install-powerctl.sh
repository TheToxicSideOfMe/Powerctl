#!/bin/bash
# PowerCTL Installation Script

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}PowerCTL Installation${NC}"
echo "========================================"

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}Error: This script must be run as root (use sudo)${NC}" 
   exit 1
fi

# Check dependencies
echo -e "${YELLOW}Checking dependencies...${NC}"
MISSING_DEPS=()

if ! command -v powerprofilesctl &> /dev/null; then
    MISSING_DEPS+=("power-profiles-daemon")
fi

if ! command -v supergfxctl &> /dev/null; then
    echo -e "${YELLOW}Warning: supergfxctl not found (optional for GPU switching)${NC}"
fi

if [ ${#MISSING_DEPS[@]} -ne 0 ]; then
    echo -e "${RED}Missing required dependencies: ${MISSING_DEPS[*]}${NC}"
    echo "Please install them first."
    exit 1
fi

echo -e "${GREEN}✓ All required dependencies found${NC}"

# Create config directory
echo -e "${YELLOW}Creating configuration directory...${NC}"
mkdir -p /etc/powerctl
echo -e "${GREEN}✓ Created /etc/powerctl${NC}"

# Create config file
echo -e "${YELLOW}Creating configuration file...${NC}"
cat > /etc/powerctl/config.conf << 'EOF'
boost=1
power_profile=balanced
EOF
chmod 644 /etc/powerctl/config.conf
echo -e "${GREEN}✓ Created /etc/powerctl/config.conf${NC}"

# Create helper script
echo -e "${YELLOW}Creating powerctl-helper script...${NC}"
cat > /usr/local/bin/powerctl-helper << 'EOF'
#!/bin/bash
set -e

PROFILE="$1"
CONFIG="/etc/powerctl/config.conf"

# Detect CPU vendor
VENDOR=$(grep -m1 vendor_id /proc/cpuinfo | awk '{print $3}')

if [[ "$VENDOR" == "AuthenticAMD" ]]; then
    BOOST_FILE="/sys/devices/system/cpu/cpufreq/boost"
    BOOST_ON=1
    BOOST_OFF=0
elif [[ "$VENDOR" == "GenuineIntel" ]]; then
    BOOST_FILE="/sys/devices/system/cpu/intel_pstate/no_turbo"
    BOOST_ON=0   # inverted
    BOOST_OFF=1
else
    exit 1
fi

apply_boost() {
    [[ -f "$BOOST_FILE" ]] && echo "$1" > "$BOOST_FILE"
}

case "$PROFILE" in
  performance)
    apply_boost "$BOOST_ON"
    powerprofilesctl set performance
    sed -i "s/^boost=.*/boost=1/" "$CONFIG"
    sed -i "s/^power_profile=.*/power_profile=performance/" "$CONFIG"
    ;;
  balanced)
    apply_boost "$BOOST_ON"
    powerprofilesctl set balanced
    sed -i "s/^boost=.*/boost=1/" "$CONFIG"
    sed -i "s/^power_profile=.*/power_profile=balanced/" "$CONFIG"
    ;;
  power-saver)
    apply_boost "$BOOST_OFF"
    powerprofilesctl set power-saver
    sed -i "s/^boost=.*/boost=0/" "$CONFIG"
    sed -i "s/^power_profile=.*/power_profile=power-saver/" "$CONFIG"
    ;;
  *)
    exit 1
esac
EOF
chmod 755 /usr/local/bin/powerctl-helper
echo -e "${GREEN}✓ Created /usr/local/bin/powerctl-helper${NC}"

# Create boot restore script
echo -e "${YELLOW}Creating powerctl-apply-boot script...${NC}"
cat > /usr/local/bin/powerctl-apply-boot << 'EOF'
#!/bin/bash
CONFIG="/etc/powerctl/config.conf"

BOOST=$(grep '^boost=' "$CONFIG" | cut -d= -f2)
PROFILE=$(grep '^power_profile=' "$CONFIG" | cut -d= -f2)

VENDOR=$(grep -m1 vendor_id /proc/cpuinfo | awk '{print $3}')

if [[ "$VENDOR" == "AuthenticAMD" ]]; then
    echo "$BOOST" > /sys/devices/system/cpu/cpufreq/boost
elif [[ "$VENDOR" == "GenuineIntel" ]]; then
    [[ "$BOOST" == "1" ]] && echo 0 > /sys/devices/system/cpu/intel_pstate/no_turbo || echo 1 > /sys/devices/system/cpu/intel_pstate/no_turbo
fi

powerprofilesctl set "$PROFILE"
EOF
chmod 755 /usr/local/bin/powerctl-apply-boot
echo -e "${GREEN}✓ Created /usr/local/bin/powerctl-apply-boot${NC}"

# Create systemd service
echo -e "${YELLOW}Creating systemd service...${NC}"
cat > /etc/systemd/system/powerctl-restore.service << 'EOF'
[Unit]
Description=Restore PowerCTL power profile
After=sysinit.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/powerctl-apply-boot

[Install]
WantedBy=multi-user.target
EOF
echo -e "${GREEN}✓ Created /etc/systemd/system/powerctl-restore.service${NC}"

# Enable and start service
echo -e "${YELLOW}Enabling systemd service...${NC}"
systemctl daemon-reload
systemctl enable powerctl-restore.service
echo -e "${GREEN}✓ Service enabled (will restore profile on boot)${NC}"

# Setup polkit rule for GUI access
echo -e "${YELLOW}Creating polkit authorization rule...${NC}"
cat > /etc/polkit-1/rules.d/50-powerctl.rules << 'EOF'
polkit.addRule(function(action, subject) {
    if ((action.id == "org.freedesktop.policykit.exec" &&
         action.lookup("program") == "/usr/local/bin/powerctl-helper") ||
        (action.id == "org.freedesktop.policykit.exec" &&
         action.lookup("program") == "/usr/bin/supergfxctl")) {
        if (subject.isInGroup("wheel") || subject.isInGroup("sudo")) {
            return polkit.Result.YES;
        }
    }
});
EOF
chmod 644 /etc/polkit-1/rules.d/50-powerctl.rules
echo -e "${GREEN}✓ Created polkit rule for passwordless execution${NC}"

echo ""
echo -e "${GREEN}========================================"
echo "PowerCTL Installation Complete!"
echo "========================================${NC}"
echo ""
echo "The following components were installed:"
echo "  • Configuration: /etc/powerctl/config.conf"
echo "  • Helper script: /usr/local/bin/powerctl-helper"
echo "  • Boot script: /usr/local/bin/powerctl-apply-boot"
echo "  • Systemd service: powerctl-restore.service"
echo "  • Polkit rule: /etc/polkit-1/rules.d/50-powerctl.rules"
echo ""
echo -e "${YELLOW}Note: You may need to log out and back in for polkit changes to take effect.${NC}"
echo ""