const webpack = require("webpack");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");

const isDev = process.env.NODE_ENV !== "production";

module.exports = {
    mode: isDev ? "development" : "production",
    entry: "./src/index.ts",
    output: {
        path: __dirname + "/dist",
        filename: "tetsuo.min.js",

        library: "beta",
        libraryTarget: "umd",
        globalObject: "typeof self !== 'undefined' ? self : this",
    },
    devtool: isDev ? "source-map" : undefined,
    resolve: {
        extensions: [".ts", ".js", ".vert", ".frag", ".glsl"],
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: "babel-loader",
                },
            },
            {
                test: /\.ts$/,
                exclude: /node_modules|examples/,
                use: {
                    loader: "ts-loader",
                },
            },
            {
                test: /\.(vert|frag|glsl)$/,
                exclude: /node_modules/,
                use: {
                    loader: "webpack-glsl-loader",
                },
            },
        ],
    },
    plugins: [
        new webpack.DefinePlugin({
            MODE: JSON.stringify(isDev ? "development" : "production"),
            NODE_ENV: JSON.stringify(process.env.NODE_ENV),
        }),
        new CleanWebpackPlugin(),
    ],
};
