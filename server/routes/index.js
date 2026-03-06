var express = require('express');
var router = express.Router();
const { getWeather } = require('../utils/weather.js');
const { translate } = require('../utils/translate.js');
const {
	generateToolPrompt,
	generateAnswerPrompt,
} = require('../utils/prompt.js');
const { callLLM } = require('../utils/llm.js');

const conversations = [];

router.post('/ask', async (req, res) => {
	const { question = '' } = req.body;

	res.setHeader('Content-Type', 'text/event-stream');
	res.setHeader('Cache-Control', 'no-cache');

	try {
		const toolPrompt = generateToolPrompt(question);
		let answer = '';
		const raw = await callLLM(toolPrompt);

		if (raw === '无函数调用') {
			const prompt = [
				'你是一个中文问答聊天机器人，请用中文回答问题。',
				...conversations.map(
					(item) =>
						`${item.role === 'user' ? '用户' : '助手'}：${item.content}`,
				),
				`用户的问题：${question}`,
			].join('\n');

			answer = await callLLM(prompt, true, (data) => {
				res.write(`${JSON.stringify({ response: data })}\n`);
			});
		} else {
			const tools = JSON.parse(raw);
			const results = [];

			for (const tool of tools) {
				try {
					if (tool.function === 'getWeather') {
						const { city, date } = tool.args;
						const weather = await getWeather(city, date);
						results.push({
							function: tool.function,
							args: tool.args,
							result: weather,
						});
					} else if (tool.function === 'translate') {
						const { input } = tool.args;
						const translation = await translate(input, { from: 'zh', to: 'en' });
						results.push({
							function: tool.function,
							args: tool.args,
							result: translation,
						});
					} else {
						console.warn(`未知工具：${tool.function}`);
						results.push({
							function: tool.function,
							args: tool.args,
							result: '未知工具',
						});
					}
				} catch (error) {
					console.error('工具调用失败：', error);
					results.push({
						function: tool.function,
						args: tool.args,
						result: '工具调用失败',
					});
				}
			}

			const answerPrompt = generateAnswerPrompt(question, results);
			answer = await callLLM(answerPrompt, true, (data) => {
				res.write(`${JSON.stringify({ response: data })}\n`);
			});
		}

		conversations.push(
			{
				role: 'user',
				content: question,
			},
			{
				role: 'assistant',
				content: answer,
			},
		);

		if (conversations.length > 20) {
			conversations.splice(0, conversations.length - 20);
		}
	} catch (error) {
		console.error('工具获取失败', error);
	} finally {
		res.end();
	}
});

router.get('/history', (req, res) => {
	res.json({
		code: 200,
		message: '操作成功',
		data: conversations,
	});
});

router.post('/clear', (req, res) => {
	conversations.length = 0;
	res.json({
		code: 200,
		message: '操作成功',
		data: null,
	});
});

module.exports = router;
