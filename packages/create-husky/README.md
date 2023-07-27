# @mr.mikey/create-husky

## 说明

为了避免繁琐无聊的配置，提交效率，将创建husky的过程做成了npm包，通过安装包执行命令即可一键在项目中生成husky配置。

自动生成以下功能：

- `git hook` 由husky自动创建
- `lint-staged` 仅对提交文件做lint校验
- `commitizen` 友好的终端交互工具，输入`npm run commit`或者`npm run push`命令即可自由选择符合angular规范的commit信息
- `cz-customizable` 自定义汉化commitizen，提供符合国人喜好的中文配置
- `commitlint`对commit-msg进行校验，不符合angular规范的commit信息将不允许提交

`npm run commit`在cmder终端演示效果：

![](https://github.com/Mr-Super-X/assets-resouece/raw/main/images/1653480834.jpg)

为了偷懒，建议安装yarn，通过yarn commit来运行更便捷。

## 使用

安装依赖（用户名没取好，输入命令时记得加上引号）
> npm install "@mr.mikey/create-husky" -D

运行（用户名没取好，输入命令时记得加上引号）
> npm init "@mr.mikey/husky"

或者

> node ./node_modules/@mr.mikey/create-husky/index.js

运行`npm init "@mr.mikey/husky"`演示效果：

![](../../images/husky-demo.png)
