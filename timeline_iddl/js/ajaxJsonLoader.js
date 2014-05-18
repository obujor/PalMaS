$.ajax({
	url: jsonFile,
	async: true,
	dataType: 'json',
	timeout: 10000,
	success: visualize,
	error: handleError
});

function handleError(data) {
	if (data.readyState === 4 && data.status === 200 && data.statusText === "OK")
		visualize(data.responseText);
	else
		console.error(data);
}