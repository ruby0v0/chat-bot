module.exports = [
	{
		type: 'function',
		function: {
			name: 'getWeather',
			description: '获取指定城市和日期的天气信息',
			parameters: {
				type: 'object',
				properties: {
					city: {
						type: 'string',
						description: '城市名称，如：北京、上海、广州',
					},
					date: {
						type: 'string',
						description: '日期，只能是：今天、明天、后天',
					},
				},
				required: ['city', 'date'],
			},
		},
	},
];
