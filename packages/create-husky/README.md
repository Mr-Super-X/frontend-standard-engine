# @mr.mikey/create-husky

## 功能说明

- 做项目基建时需要对团队成员commit-msg进行规范化限制，一般采用业界公认的angular提交规范，为了避免繁琐无聊的配置，将这个过程做成了npm包，通过安装包执行命令即可一键在项目中生成配置，并通过husky来创建git hook限制提交msg格式。
- 不会吧！不会还有人在手动维护CHANGELOG文档和管理版本吧！工具包集成了 [release-it](https://github.com/release-it/release-it/blob/main/README.md) 和 auto-changelog 功能，你可以在初始化的时候选择是否需要它，它的主要作用是帮助我们快速生成符合 [Semantic Versioning](https://semver.org/) 规范的版本，自动打tag和修改package.json中的version字段，并且支持自动生成changelog功能，生成的CHANGELOG.md在项目根目录下。

初始化完成后输入 `npm run commit` 在cmder终端演示效果：

![](https://github.com/Mr-Super-X/assets-resouece/raw/main/images/1653480834.jpg)

初始化完成后输入 `npm run release:minor` 在cmder终端的演示效果：

![](https://raw.githubusercontent.com/release-it/release-it/main/docs/assets/release-it.svg)

项目根目录下自动生成的changelog文档格式长这样：

![](../../images/changelog.jpg)

为了偷懒，建议安装`yarn`，通过`yarn commit`来运行能少输几个字符

## 使用

环境
> node: ^14.18.0 || >=16.0.0

安装依赖（用户名没取好，输入命令时记得加上引号）
> npm install "@mr.mikey/create-husky" -D

初始化（用户名没取好，输入命令时记得加上引号）
> npm init "@mr.mikey/husky"

或者

> node ./node_modules/@mr.mikey/create-husky/index.mjs

初始化命令 `npm init "@mr.mikey/husky"` 或者 `node ./node_modules/@mr.mikey/create-husky/index.mjs` 演示效果：

![](../../images/husky-demo.png)

## 自动生成&修改文件

package.json 会新增以下内容

```json
"scripts": {
  "prepare": "husky install",
  "commit": "git add . && cz",
  "push": "git add . && cz && git push",

  // 如果你选择安装release-it
  "release:major": "release-it major",
  "release:minor": "release-it minor",
  "release:patch": "release-it patch"
},
"devDependencies": {
  "@commitlint/cli": "^17.6.7",
  "@commitlint/config-conventional": "^17.6.7",
  "commitizen": "^4.3.0",
  "commitlint-config-cz": "^0.13.3",
  "cz-customizable": "^7.0.0",
  "husky": "^8.0.3",
  "lint-staged": "^13.2.3",

  // 如果你选择安装release-it
  "@release-it/conventional-changelog": "^7.0.0",
  "auto-changelog": "^2.4.0",
  "release-it": "^16.0.0"
}
"config": {
  "commitizen": {
    "path": "./node_modules/cz-customizable"
  },
  "cz-customizable": {
    "config": "./.cz-config.js"
  }
}
```

scripts说明

| 依赖          | 说明                                                   |
| ------------- | ------------------------------------------------------ |
| prepare       | npm install时自动触发husky安装，保证团队内成员都能使用 |
| commit        | 一键触发commit-msg交互选择工具并commit                 |
| push          | 一键触发commit-msg交互选择工具并push                   |
| release:major | 一键发布major版本                                      |
| release:minor | 一键发布minor版本                                      |
| release:patch | 一键发布patch版本                                      |

devDependencies说明（commitlint功能安装的是（2023/07/28）最新稳定版，release-it功能安装的是（2023/08/10）最新稳定版，安装时会固定以下版本号，防止某个包断崖式更新导致无法使用该功能）

| 依赖                                     | 说明                                                                                                                            |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| @commitlint/cli@17.6.7                   | commitlint基础，对commit-msg进行校验，不符合angular规范的commit信息将不允许提交                                                 |
| @commitlint/config-conventional@17.6.7   | 用于commitlint验证msg是否符合angular规范                                                                                        |
| commitizen@4.3.0                         | 友好的终端交互工具，输入命令即可自由选择符合angular规范的commit信息                                                             |
| commitlint-config-cz@0.13.3              | 用于cz的commitlint可共享配置文件可自定义（用于常规提交和常规变更日志的可自定义Commitizen适配器）                                |
| cz-customizable@7.0.0                    | 自定义汉化commitizen，提供符合国人喜好的中文配置                                                                                |
| husky@8.0.3                              | git hook工具                                                                                                                    |
| lint-staged@13.2.3                       | 仅对commit的文件做lint校验工具                                                                                                  |
| release-it@16.0.0                        | 使用release-it进行版本管理，并通过其多功能配置、强大的插件系统和挂钩发布到任何地方，以执行测试、构建和/或发布项目所需的任何命令 |
| @release-it/conventional-changelog@7.0.0 | 这个插件将提供推荐的bump来发布它，并更新变更日志文件例如changelog文件                                                           |
| auto-changelog@2.4.0                     | 用于从git标记和提交历史生成变更日志                                                                                             |

config说明

config中新增了commitizen的路径配置，默认配置为cz-customizable表示自定义commitizen，同时配置cz-customizable，让它读取生成的自定义配置文件.cz-config.js来实现汉化功能

根目录下新增文件

- lint-staged.config.js：lint-staged配置模板，可自行修改
- .cz-config.js：自定义终端汉化交互配置模板，可自行修改
- .commitlintrc.js：commitlint配置模板，可自行修改

## 试用步骤

1. 新建文件夹，如husky-demo
2. 打开终端进入husky-demo目录
3. 输入 `npm init -y` 创建package.json
4. 输入 `git init` 创建.git目录
5. 输入 `npm install "@mr.mikey/create-husky" -D` 安装依赖
6. 输入 `npm init "@mr.mikey/husky"` 执行依赖包
7. 根目录下添加.gitignore，将node_modules放进去，否则文件太多啦
8. 成功后即可体验输入 `npm run commit` 在终端选择规范的commit-msg

## 非前端项目如何使用？

其它语言有没有类似的这些工具包我不清楚，但你要想在非前端项目中使用的话也是可以的，只需要本地安装一个node环境，然后全局安装这个包即可

步骤：

1. 安装 `node：^14.18.0 || >=16.0.0` [附上链接](https://nodejs.cn/)
2. 终端输入命令全局安装工具包： `npm install "@mr.mikey/create-husky" -g`
3. 终端输入命令运行工具包： `npm init "@mr.mikey/husky"`

完成后会在项目根目录下生成上述文件，但你可能并不想提交这些文件，所以你可以在.gitignore文件中忽略它们，配置我写好了直接cv就行

```bash
# 忽略create-husky生成文件 start
node_modules
.husky
package.json
package-lock.json
pnpm-lock.yaml # 如果你选择pnpm安装
yarn.lock # 如果你选择yarn安装
.commitlintrc.js
.cz-config.js
lint-staged.config.js
# 忽略create-husky生成文件 end
```

然后你就可以愉快的体验交互式规范commit了

觉得好用不妨点个star呀🙋
