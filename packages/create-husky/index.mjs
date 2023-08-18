#!/usr/bin/env node
import prompts from "prompts";
import beautify from "js-beautify";
import { red, cyan, green } from "kolorist";
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { cwd } from "node:process";
import { exec } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSpinner } from "nanospinner";
import { getLintStagedOption, deleteFolderRecursive } from "./src/index.js";

const projectDirectory = cwd(), // 项目目录
  pkgFile = resolve(projectDirectory, "package.json"), // 获取项目package.json
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
  needDependencies = ["eslint", "prettier", "stylelint"], // pkg包中需包含的依赖
  // 命令枚举
  commandMap = {
    npm: "npm install && npm install --save-dev ",
    yarn: "yarn && yarn add --dev ",
    pnpm: "pnpm install && pnpm install --save-dev ",
  };
// husky输出的脚本内容
const createGitHook = `npx husky install`;
const createCommitHook = `npx husky add .husky/pre-commit "npx lint-staged"`;
const createMsgHook = `npx husky add .husky/commit-msg "npx --no-install commitlint --edit \$\{1\}"`;

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
        deleteFolderRecursive(huskyFile);
      }
      return null;
    },
    name: "overwriteChecker",
  },
];

// 创建职责链模式基础类
class ChainBaseHandler {
  constructor() {
    this.nextHandler = null;
  }

  // 设置下一个操作工序
  setNextHandler(handler) {
    if (this.nextHandler === null) {
      this.nextHandler = handler;
    } else {
      this.nextHandler.setNextHandler(handler);
    }

    // 实现链式调用
    return this;
  }

  /**
   * 生成依赖包工厂 - 通过读取用户操作结果来生成要安装的依赖
   * @param {*} result 用户操作结果-集合
   * @param {*} bool 用户操作结果-当前
   * @param {*} pkg 需要安装的依赖
   * @returns 返回当前工序加工完成后的产物
   */
  generatePackage(result, bool, pkg) {
    if (bool) {
      // 当前要安装的依赖
      const currentPackage = pkg;
      // 下一道工序是否产生新的依赖
      const nextPackages = this.nextHandler
        ? this.nextHandler.handler(result)
        : "";

      // 组合当前依赖和下一道工序产生的结果
      const packages = `${currentPackage} ${nextPackages}`;

      // 返回结果
      return packages;
    } else {
      // 如果用户当前操作取消了，则不需要继续
      return "";
    }
  }

  /**
   * 生成职责链
   * @param {*} chains Array 工序集合组成的职责链
   * @returns 返回第一道工序，因为操作结果要从第一道工序往下传递
   */
  static generateChain(chains = []) {
    if(chains.length === 0) {
      throw new Error(cyan("请传入要执行的工序集合")); 
    }
    // 取出第一道工序
    const first = chains[0]
  
    // 由第一道工序开始往下一道工序传递，所以i从下标1开始
    for(let i = 1; i < chains.length; i++) {
      first.setNextHandler(chains[i])
    }
  
    // 返回第一道工序，因为操作结果要从第一道工序往下传递
    return first
  }
}

// 默认要安装的依赖处理工序
class DefaultHandler extends ChainBaseHandler {
  handler(result) {
    const huskyPackages = "husky@8.0.3";
    const preCommitPackages = "lint-staged@13.2.3";
    const currentPackage = `${huskyPackages} ${preCommitPackages}`;

    // result必须传给下一道工序使用
    // 它就相当于一份生产合同，下一个工厂也要按照合同来生产内容
    return this.generatePackage(result, result.selectLint, currentPackage);
  }
}

// 用户确认选择commitlint要安装的依赖处理工序
class CommitlintHandler extends ChainBaseHandler {
  handler(result) {
    const currentPackage =
      "@commitlint/cli@17.6.7 @commitlint/config-conventional@17.6.7 commitizen@4.3.0 commitlint-config-cz@0.13.3 cz-customizable@7.0.0";

    // result必须传给下一道工序使用
    // 它就相当于一份生产合同，下一个工厂也要按照合同来生产内容
    return this.generatePackage(result, result.commitlint, currentPackage);
  }
}

// 用户确认选择release-it要安装的依赖处理工序
class ReleaseItHandler extends ChainBaseHandler {
  handler(result) {
    const currentPackage =
      "release-it@16.0.0 @release-it/conventional-changelog@7.0.0 auto-changelog@2.4.0";

    // result必须传给下一道工序使用
    // 它就相当于一份生产合同，下一个工厂也要按照合同来生产内容
    return this.generatePackage(result, result.releaseit, currentPackage);
  }
}

// 初始化函数
async function init() {
  console.log(
    cyan(
      "\n🐣欢迎使用git hook添加工具，使用本工具前请确保该工程已关联git仓库！\n"
    )
  );
  console.log(`当前package.json路径：${pkgFile}`);
  // 同步检查package.json是否存在
  if (!existsSync(pkgFile)) {
    console.log(red("错误，项目根目录下未找到package.json"));
    return;
  }
  // 读取项目package.json
  const pkgContent = JSON.parse(readFileSync(pkgFile));

  // 读取dependencies和devDependencies
  const devs = {
    ...(pkgContent?.devDependencies || {}),
    ...(pkgContent?.dependencies || {}),
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

  // 设置工序之间如何工作，未来要加入新的工序只需创建新的工序类，然后在这里配置即可
  const chains = [new DefaultHandler(), new CommitlintHandler(), new ReleaseItHandler()]

  // 拿到设置好的职责链的第一道工序
  const firstProcess = ChainBaseHandler.generateChain(chains)

  // 调用第一道工序，将操作结果传入，得到所有工序的处理结果
  const packages = firstProcess.handler(result);

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
    let newPakContent = JSON.parse(readFileSync(pkgFile));

    // commit-msg生成脚本
    const commitMsgScript = commitlint
      ? {
          prepare: "husky install", // install pkg时自动触发husky初始化
          commit: "git add . && cz", // 快捷命令 - 暂存
          push: "git add . && cz && git push", // 快捷命令 - 推送
        }
      : {};

    // release-it生成脚本
    const releaseitScript = releaseit
      ? {
          "release:major": "release-it major", // 发布major版本
          "release:minor": "release-it minor", // 发布minor版本
          "release:patch": "release-it patch", // 发布patch版本
        }
      : {};

    // 写入脚本
    newPakContent.scripts = {
      ...newPakContent.scripts,
      ...commitMsgScript,
      ...releaseitScript,
    };

    // commit-msg生成配置
    const commitMsgConfig = commitlint
      ? {
          commitizen: {
            path: "./node_modules/cz-customizable",
          },
          "cz-customizable": {
            config: "./.cz-config.js",
          },
        }
      : {};

    // 写入config配置
    newPakContent.config = {
      ...(newPakContent?.config || {}),
      ...commitMsgConfig,
    };

    // 写入package.json文件，后面的参数用于美化json格式
    writeFileSync(pkgFile, JSON.stringify(newPakContent, null, "\t"));
    writeFileSync(lintStagedFile, lintStagedContent);

    // commitlint配置模板
    if (commitlint) {
      copyFileSync(commitlintFileTemplateDir, commitlintFile);
      copyFileSync(czFileTemplateDir, czFile);
    }

    // release-it配置模板
    if (releaseit) {
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
