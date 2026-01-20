# Maintainer: Rayen Stark <Rayen.Stark@protonmail.com>
pkgname=powerctl
_pkgname=PowerCTL
pkgver=0.1.0
pkgrel=1
pkgdesc="PowerCTL: CPU/GPU power profile manager for Linux"
arch=('x86_64')
url="https://github.com/TheToxicSideOfMe/Powerctl"
license=('MIT')
depends=('power-profiles-daemon')
makedepends=('rust' 'cargo' 'nodejs' 'pnpm')
source=("$pkgname-$pkgver.tar.gz::$url/archive/refs/tags/v$pkgver.tar.gz")
sha256sums=('SKIP') # replace with actual checksum in production

install=powerctl.install

build() {
  cd "$_pkgname-$pkgver"

  # Install JS deps and build frontend
  pnpm install
  pnpm tauri build
}

package() {
  cd "$_pkgname-$pkgver"

  # Install the Tauri binary
  install -Dm755 \
    src-tauri/target/release/powerctl \
    "$pkgdir/usr/bin/powerctl"

  # Include installer script so users can run it manually
  install -Dm755 \
    src-tauri/scripts/install-powerctl.sh \
    "$pkgdir/usr/local/bin/install-powerctl.sh"

  # Optional: install license
  install -Dm644 LICENSE "$pkgdir/usr/share/licenses/$pkgname/LICENSE"
}
