#!/bin/bash
# Start PostgreSQL container for VistOs

CONTAINER_NAME="vistos-db"
DB_PASSWORD="password"
DB_PORT=5432

# Check if container exists
if [ "$(docker ps -aq -f name=$CONTAINER_NAME)" ]; then
    if [ "$(docker ps -q -f name=$CONTAINER_NAME)" ]; then
        echo "Container $CONTAINER_NAME is already running."
    else
        echo "Starting existing container $CONTAINER_NAME..."
        docker start $CONTAINER_NAME
    fi
else
    echo "Creating and starting new PostgreSQL container..."
    docker run -d \
        --name $CONTAINER_NAME \
        -e POSTGRES_PASSWORD=$DB_PASSWORD \
        -e POSTGRES_DB=vistos \
        -p $DB_PORT:5432 \
        postgres:12
fi

echo "Waiting for database to be ready..."
sleep 3
echo "Database started on port $DB_PORT"
