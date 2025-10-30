# Build Instructions for Staff Revenue Manager

## 🚀 Quick Build

### Option 1: Build All Architectures (Recommended)
```bash
# Windows Command Prompt
build-all.bat

# PowerShell
.\build-all.ps1

# Or use npm script
npm run build-all
```

### Option 2: Build Individual Architectures
```bash
# 64-bit Windows (x64) - Most common
npm run build-win-x64

# 32-bit Windows (ia32) - Older systems
npm run build-win-ia32

# ARM64 Windows - Surface Pro X, ARM laptops
npm run build-win-arm64
```

## 📦 Build Outputs

After building, you'll find these files in the `dist` folder:

### NSIS Installers
- `Staff Revenue Manager-1.0.0-x64-setup.exe` - 64-bit installer
- `Staff Revenue Manager-1.0.0-ia32-setup.exe` - 32-bit installer  
- `Staff Revenue Manager-1.0.0-arm64-setup.exe` - ARM64 installer

### Portable Versions
- `Staff Revenue Manager-1.0.0-x64-portable.exe` - 64-bit portable
- `Staff Revenue Manager-1.0.0-ia32-portable.exe` - 32-bit portable
- `Staff Revenue Manager-1.0.0-arm64-portable.exe` - ARM64 portable

### Archive Formats
- `Staff Revenue Manager-1.0.0-x64.zip` - 64-bit ZIP
- `Staff Revenue Manager-1.0.0-ia32.zip` - 32-bit ZIP
- `Staff Revenue Manager-1.0.0-arm64.zip` - ARM64 ZIP
- `Staff Revenue Manager-1.0.0-x64.7z` - 64-bit 7Z
- `Staff Revenue Manager-1.0.0-ia32.7z` - 32-bit 7Z
- `Staff Revenue Manager-1.0.0-arm64.7z` - ARM64 7Z

## 🎯 Target Windows Versions

| Architecture | Windows Version | Description |
|-------------|----------------|-------------|
| **x64** | Windows 7+ | 64-bit Intel/AMD processors |
| **ia32** | Windows 7+ | 32-bit Intel/AMD processors |
| **arm64** | Windows 10+ | ARM64 processors (Surface Pro X, etc.) |

## 🔧 Prerequisites

1. **Node.js** (v16 or higher)
2. **npm** (v8 or higher)
3. **Windows Build Tools** (for native modules)
4. **Git** (for version control)

### Install Windows Build Tools
```bash
npm install --global windows-build-tools
# OR
npm install --global @microsoft/rush-stack-compiler-3.9
```

## 🛠️ Manual Build Steps

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Rebuild Native Modules**
   ```bash
   npm run rebuild
   ```

3. **Build for Specific Architecture**
   ```bash
   electron-builder --win --x64
   electron-builder --win --ia32
   electron-builder --win --arm64
   ```

## 📋 Build Configuration

The build configuration is in `package.json` under the `"build"` section:

- **NSIS Installer**: Full installer with uninstaller
- **Portable**: No installation required, run directly
- **ZIP/7Z**: Compressed archives for distribution

## 🚨 Troubleshooting

### Common Issues

1. **"better-sqlite3" build error**
   ```bash
   npm run rebuild
   ```

2. **"NODE_MODULE_VERSION" mismatch**
   ```bash
   npm run rebuild
   ```

3. **Build fails for specific architecture**
   - Check if you have the required build tools
   - Try building one architecture at a time

4. **Out of memory during build**
   ```bash
   set NODE_OPTIONS=--max-old-space-size=4096
   npm run build-all
   ```

### Build Logs
Check the console output for detailed error messages. Common issues:
- Missing dependencies
- Native module compilation errors
- Insufficient disk space
- Antivirus blocking the build process

## 📁 File Structure After Build

```
dist/
├── Staff Revenue Manager-1.0.0-x64-setup.exe
├── Staff Revenue Manager-1.0.0-ia32-setup.exe
├── Staff Revenue Manager-1.0.0-arm64-setup.exe
├── Staff Revenue Manager-1.0.0-x64-portable.exe
├── Staff Revenue Manager-1.0.0-ia32-portable.exe
├── Staff Revenue Manager-1.0.0-arm64-portable.exe
├── Staff Revenue Manager-1.0.0-x64.zip
├── Staff Revenue Manager-1.0.0-ia32.zip
├── Staff Revenue Manager-1.0.0-arm64.zip
├── Staff Revenue Manager-1.0.0-x64.7z
├── Staff Revenue Manager-1.0.0-ia32.7z
└── Staff Revenue Manager-1.0.0-arm64.7z
```

## 🎉 Distribution

After building, you can distribute the appropriate file based on the target system:

- **Most Windows PCs**: Use the `x64` version
- **Older Windows PCs**: Use the `ia32` version  
- **Surface Pro X, ARM laptops**: Use the `arm64` version
- **Portable use**: Use the `portable.exe` versions
- **Easy distribution**: Use the `.zip` or `.7z` archives

## 📞 Support

If you encounter issues during the build process, check:
1. Node.js and npm versions
2. Windows Build Tools installation
3. Available disk space (at least 2GB free)
4. Antivirus software settings
5. Build logs for specific error messages