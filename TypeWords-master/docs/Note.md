多语言地址：https://www.yuque.com/zhangyurang/ghwvmn/idhcg59wc2204o5n#Ah4t

例句:On Jan. 20, former Sen. Barack Obama became the 44th President of the U.S. Millions attended the Inauguration.
sentence-tokenizer
    可以正常断句，但无法识别例句
sentence-splitter
    无法正常断句（在引号里面的问号和感叹号会被断句），但可以识别例句

https://github.com/Tessmore/sbd
    无法识别Mr.James Scott has a garage in Silbury and now he has just bought another garage in Pinhurst. 
    会将Mr.James 断句

wink-nlp
    'What a day!' I thought.
    'What are you doing?' she asked.
    会被断句

compromise
    表现良好，另外自带分词功能

以上所有库都会将：'Do you always get up so late? It's one o'clock!'分成两句....

1 错题本，添加错误次数
 
A cold welcome 有bug

[EditAbleText.vue](src%2Fcomponents%2FEditAbleText.vue) 不能自动聚焦

单词发音，点击第二遍时减速
 
点击句子播放的音乐，需要可暂停
 
nce1-16.A polite request.解析出来有问题

I found this note on my car: 'Sir, we welcome you to our city. This is a 'No Parking'  area. You will enjoy your stay here if you pay attention to our street signs. This note is only a reminder.' If you receive a request like this, you cannot fail to obey it!

'No Parking'  会被截断


Food and talk
    A new play is coming to "The Globe"soon, I said. Will you be seeing it? 

26的 of curse

1、例句可以选中单词，并添加到收藏
2、ABC页面太墨迹，不简洁，进度复杂，本周学习记录改成日历，有个标记，+激励分享功能，满足炫耀欲望



1、跟打（看着单词跟打）
错：Hard
对：不操作

2、默写（简单，能看到长度和翻译，打错自动校验）
错：Again
对：
一次输入正确：Good
错了N次才输入正确：不操作

2、听写
错：Again 
对：
一次输入正确：Good
错了N次才输入正确：不操作                                 

3、自测：                               
错：Again
对：
一次输入正确：Good
错了N次才输入正确：不操作

4、默写（困难，只有翻译，看不到长度，需自己提交校验）：
错：Again
对：
一次输入正确：Easy
错了N次才输入正确：不操作


我感觉这样加评分机制与我原来的学习流程不是太融合，因为我原来的学习流程比较特别

下文中用到的一些名词：
一、错词收集：只要输入错误或“自测”时标记不认识的单词，会收集到错词列表
二、错误练习检查流程：
1、如果错词列表不为空，则将当前单词练习列表替换为错词，并开始进行与 “学习新词” 时的第一阶段同样的流程（即“跟打”/“拼写”循环，同时进行“错词收集”，详细见下文），一直循环到没有错误为止
2、如果错词列表为空，则进入下一流程

举例： 新词 20 个，复习 80 个（这80中，前20个是上次学习，后60个是往前2次-7次共6次学习的单词里面随机按比例取的，离现在日期越近，取的越多）
我设计了5个模式：

1、跟打（看着单词跟打） 
2、拼写（能看到长度和翻译，自动发音，打错自动校验） 
3、听写（啥都不显示，只播放单词音频）
4、自测（只显示单词本身，提供两个按钮：认识、不认识）
5、默写（只显示翻译，看不到单词长度，不自动发音，需自己提交校验）：

每次学习分为两个阶段：
一、学习新词
1、开始“跟打”练习单词列表（20个新词），每7个词开始循环“拼写”，同时进行“错词收集”，当“跟打”与“拼写”完成之后进入“错误练习检查流程”，如无则进入下一阶段
2、开始“听写”练习单词列表（20个新词），同时进行“错词收集”，完成之后进入“错误练习检查流程”，如无则进入下一阶段
3、开始“默写”练习单词列表（20个新词），同时进行“错词收集”，完成之后进入“错误练习检查流程”，如无则进入下一阶段
二、复习旧词
1、开始“自测”练习单词列表（80个新词），同时进行“错词收集”，完成之后进入“错误练习检查流程”，如无则进入下一阶段
2、开始“听写”练习单词列表（上个阶段的错词），同时进行“错词收集”，完成之后进入“错误练习检查流程”，如无则进入下一阶段
3、开始“默写”练习单词列表（上上个阶段的错词），同时进行“错词收集”，完成之后进入“错误练习检查流程”，如无则进入下一阶段

vscode 发布命令：vsce package
openvsx:https://open-vsx.org/user-settings/extensions
vscode:https://marketplace.visualstudio.com/manage/publishers/TypeWords