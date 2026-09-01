<?php

it('responds to the health check endpoint', function () {
    $this->get('/up')->assertOk();
});
