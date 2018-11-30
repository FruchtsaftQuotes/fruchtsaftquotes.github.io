fetch("https://api.fruchtsaft.veyxos.de")
	.then(res => {
		return res.json()
	}).then(json => {
		console.log(`API MESSAGE: ${json}`)
	}).catch(
		e => console.error(e)
	)
