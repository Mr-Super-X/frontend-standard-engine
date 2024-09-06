#!/usr/bin/env node
import prompts from "prompts";
import beautify from "js-beautify";
import { red, cyan, green } from "kolorist";
import {
  copyFileSync,
  existsSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { cwd } from "node:process";
import { exec } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSpinner } from "nanospinner";
import { getLintStagedOption, deleteFolderRecursive } from "./src/index.js";

const projectDirectory = cwd(), // 项目目录
  pakFile = resolve(projectDirectory, "package.json"), // 获取项目package.json
  huskyFile = resolve(projectDirectory, ".husky"), // 获取husky目录
  lintStagedFile = resolve(projectDirectory, "lint-staged.config.js"), // 获取lint-staged配置模板
  commitlintFile = resolve(projectDirectory, ".commitlintrc.js"), // 获取commitlint配置模板
  czFile = resolve(projectDirectory, ".cz-config.js"), // 获取cz配置模板
  releaseItFile = resolve(projectDirectory, ".release-it.json"), // 获取release-it配置模板
  // 获取相关配置的文件目录
  commitlintFileTemplateDir = resolve(
    fileURLToPath(import.meta.url),
    "../src/template",
    ".commitlintrc.js"
  ),
  czFileTemplateDir = resolve(
    fileURLToPath(import.meta.url),
    "../src/template",
    ".cz-config.js"
  ),
  releaseItFileTemplateDir = resolve(
    fileURLToPath(import.meta.url),
    "../src/template",
    ".release-it.json"
  ),
  needDependencies = ["eslint", "prettier", "stylelint"], // pak包中需包含的依赖
  // 命令枚举
  commandMap = {
    npm: "npm install && npm install --save-dev ",
    yarn: "yarn && yarn add --dev ",
    pnpm: "pnpm install && pnpm install --save-dev ",
  },
  // 需要安装的依赖
  huskyPackages = "husky@8.0.3",
  preCommitPackages = "lint-staged@13.2.3",
  commitMsgPackages =
    "@commitlint/cli@17.6.7 @commitlint/config-conventional@17.6.7 commitizen@4.3.0 commitlint-config-cz@0.13.3 cz-customizable@7.0.0",
  releaseItPackages = "release-it@16.0.0 @release-it/conventional-changelog@7.0.0 auto-changelog@2.4.0"
// husky输出的脚本内容
const createGitHook = `npx husky install`;
const createCommitHook = `${process.cwd()}/node_modules/.bin/husky add .husky/pre-commit "npx lint-staged"`;
const createMsgHook = `${process.cwd()}/node_modules/.bin/husky add .husky/commit-msg "npx --no-install commitlint --edit \$\{1\}"`;

// 终端husky询问
const huskyQuestions = [
  {
    type: "select",
    name: "manager",
    message: "请选择包管理器：",
    choices: [
      {
        title: "npm",
        value: "npm",
      },
      {
        title: "yarn",
        value: "yarn",
      },
      {
        title: "pnpm",
        value: "pnpm",
      },
    ],
  },
  {
    type: "confirm",
    name: "commitlint",
    message: "是否需要commit信息验证？",
  },
];

// release-it 询问
const releaseItQuestions = [
  {
    type: "confirm",
    name: "releaseit",
    message: "是否需要安装release-it和auto-changelog功能？",
  },
];

// 终端没有eslint/prettier/stylelint的询问
const noLintQuestions = [
  {
    type: "confirm",
    name: "isContinue",
    message: "未在package.json中找到eslint/prettier/stylelint，是否继续？",
  },
  {
    // 处理上一步的确认值。如果用户没同意，抛出异常。同意了就继续
    type: (_, { isContinue } = {}) => {
      if (isContinue === false) {
        throw new Error(red("✖ 取消操作"));
      }
      return null;
    },
    name: "isContinueChecker",
  },
  {
    type: "multiselect",
    name: "selectLint",
    message: "请选择已安装的依赖（将根据选项生成默认的lint-staged配置）：",
    choices: [
      {
        title: "eslint",
        value: "eslint",
      },
      {
        title: "prettier",
        value: "prettier",
      },
      {
        title: "stylelint",
        value: "stylelint",
      },
    ],
  },
];

// 终端是否执行覆盖操作的确认
const overwriteQuestions = [
  {
    type: "confirm",
    name: "overwrite",
    message: "该项目已安装husky，是否重新安装？",
  },
  {
    // 处理上一步的确认值。如果用户没同意，抛出异常。同意了就继续
    type: (_, { overwrite } = {}) => {
      if (overwrite === false) {
        throw new Error(red("✖ 取消操作"));
      } else {
        // 用户同意覆盖，则先清空.husky文件夹，然后走后面的重新安装流程
        // 如果不清空.husky则每次都会在git hook钩子中push一条代码导致很多重复内容
        deleteFolderRecursive(huskyFile)
      }
      return null;
    },
    name: "overwriteChecker",
  },
];

// 初始化函数
async function init() {
  console.log(
    cyan(
      "\n🐣欢迎使用git hook添加工具，使用本工具前请确保该工程已关联git仓库！\n"
    )
  );
  console.log(`当前package.json路径：${pakFile}`);
  // 同步检查package.json是否存在
  if (!existsSync(pakFile)) {
    console.log(red("错误，项目根目录下未找到package.json"));
    return;
  }
  // 读取项目package.json
  const pakContent = JSON.parse(readFileSync(pakFile));

  // 读取dependencies和devDependencies
  const devs = {
    ...(pakContent?.devDependencies || {}),
    ...(pakContent?.dependencies || {}),
  };
  // 检查依赖
  const pakHasLint = needDependencies.filter((item) => {
    return item in devs;
  });
  // 确定终端要询问的内容
  const questions =
    pakHasLint.length === 0
      ? [...noLintQuestions, ...huskyQuestions, ...releaseItQuestions]
      : huskyQuestions;
  // 同步检查.husky目录是否存在，如果存在，则在终端询问是否要覆盖
  if (existsSync(huskyFile)) {
    questions.unshift(...overwriteQuestions);
  }

  // 通过执行prompts在终端产生交互，并返回结果
  let result = {};
  try {
    result = await prompts(questions, {
      onCancel: () => {
        throw new Error(red("❌Bye~"));
      },
    });
  } catch (cancelled) {
    console.log(cancelled.message);
    return;
  }

  // 读取操作结果
  const { selectLint, manager, commitlint, releaseit } = result;

  // 判断用户是否选择commitlint，安装不同的包
  const commitlintPackages = commitlint
    ? `${huskyPackages} ${preCommitPackages} ${commitMsgPackages}`
    : `${huskyPackages} ${preCommitPackages}`;

  // 判断用户是否选择安装release-it，选择了则安装相关包
  const packages = releaseit ? `${commitlintPackages} ${releaseItPackages}` : `${commitMsgPackages}`

  // 判断用户是否选择commitlint，生成不同的git hook
  const createHookCommand = commitlint
    ? `${createGitHook} && ${createCommitHook} && ${createMsgHook}`
    : `${createGitHook} && ${createCommitHook}`;

  // 生成安装命令
  const command = `${commandMap[manager]}${packages}`;

  // 根据用户选择生成lint-staged.config的内容
  const lintStagedContent = beautify(
    `module.exports = ${JSON.stringify(
      getLintStagedOption(selectLint || pakHasLint)
    )}`,
    {
      indent_size: 2, // 缩进两个空格
      space_in_empty_paren: true,
    }
  );
  // 创建安装进度
  const spinner = createSpinner("Installing packages...").start();
  // 执行install安装命令
  exec(`${command}`, { cwd: projectDirectory }, (error) => {
    if (error) {
      spinner.error({
        text: red("Failed to install packages!"),
        mark: "✖",
      });
      console.error(error);
      return;
    }
    // 写入package.json
    let newPakContent = JSON.parse(readFileSync(pakFile));

    // commit-msg生成脚本
    const commitMsgScript = commitlint ? {
      prepare: "husky install", // install pkg时自动触发husky初始化
      commit: "git add . && cz", // 快捷命令 - 暂存
      push: "git add . && cz && git push", // 快捷命令 - 推送
    } : {}

    // release-it生成脚本
    const releaseitScript = releaseit ? {
      "release:major": "release-it major", // 发布major版本
      "release:minor": "release-it minor", // 发布minor版本
      "release:patch": "release-it patch", // 发布patch版本
    } : {}

    // 写入脚本
    newPakContent.scripts = {
      ...newPakContent.scripts,
      ...commitMsgScript,
      ...releaseitScript,
    };

    // commit-msg生成配置
    const commitMsgConfig = commitlint ? {
      commitizen: {
        path: "./node_modules/cz-customizable",
      },
      "cz-customizable": {
        config: "./.cz-config.js",
      },
    } : {}

    // 写入config配置
    newPakContent.config = {
      ...(newPakContent?.config || {}),
      ...commitMsgConfig,
    };

    // 写入package.json文件，后面的参数用于美化json格式
    writeFileSync(pakFile, JSON.stringify(newPakContent, null, "\t"));
    writeFileSync(lintStagedFile, lintStagedContent);

    // commitlint配置模板
    if (commitlint) {
      copyFileSync(commitlintFileTemplateDir, commitlintFile);
      copyFileSync(czFileTemplateDir, czFile);
    }

    // release-it配置模板
    if(releaseit) {
      copyFileSync(releaseItFileTemplateDir, releaseItFile);
    }

    // 安装成功提示
    spinner.success({ text: green("安装成功~准备添加钩子! 🎉"), mark: "✔" });

    // 创建添加hook进度提示
    const hookSpinner = createSpinner("生成配置中...").start();

    // 执行添加hook命令
    exec(`${createHookCommand}`, { cwd: projectDirectory }, (error) => {
      if (error) {
        hookSpinner.error({
          text: red(`生成钩子失败，请手动执行${createHookCommand}`),
          mark: "✖",
        });
        console.error(error);
        return;
      }
      hookSpinner.success({ text: green("一切就绪! 🎉"), mark: "✔" });
    });
  });
}

init().catch((e) => {
  console.error(e);
});
