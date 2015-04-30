DIR?=./tmp

all: start test stop

test:
	npm test

start: 7711 7712 7713
	@while [ ! `disque cluster nodes | grep ' connected$$' | wc -l` -eq $(words $^) ]; do \
		sleep 0.1; \
	done

stop:
	@kill `cat $(DIR)/disque.*.pid`

%:
	@disque-server \
		--port $@ \
		--dir $(DIR) \
		--daemonize yes \
		--bind 127.0.0.1 \
		--loglevel notice \
		--pidfile disque.$@.pid \
		--appendfilename disque.$@.aof \
		--cluster-config-file disque.$@.nodes \
		--logfile disque.$@.log
	@disque -p $@ CLUSTER MEET 127.0.0.1 7711 > /dev/null

.PHONY: test all
