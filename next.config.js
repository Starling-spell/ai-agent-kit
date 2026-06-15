/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // Silence optional deps pulled in by wallet/web3 libraries (WalletConnect etc.).
    config.externals.push("pino-pretty", "lokijs", "encoding");
    // MetaMask SDK references a React-Native-only storage module; not used on web.
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "@react-native-async-storage/async-storage": false,
    };
    // viem's `tempo` chain pulls an `ox` module via a dynamic expression.
    config.ignoreWarnings = [
      ...(config.ignoreWarnings ?? []),
      { module: /node_modules\/ox\// },
    ];
    return config;
  },
};

module.exports = nextConfig;
