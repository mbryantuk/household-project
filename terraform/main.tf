# --- ITEM 146: INFRASTRUCTURE AS CODE (AWS FOUNDATION) ---
# This is a representative configuration for production deployment.

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.region
}

# 1. VPC & Networking
module "vpc" {
  source = "terraform-aws-modules/vpc/aws"
  name   = "hearthstone-vpc"
  cidr   = "10.0.0.0/16"

  azs             = ["us-east-1a", "us-east-1b"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24"]

  enable_nat_gateway = true
}

# 2. RDS (PostgreSQL)
resource "aws_db_instance" "hearth_db" {
  identifier           = "hearthstone-prod"
  allocated_storage    = 20
  engine               = "postgres"
  engine_version       = "16.1"
  instance_class       = "db.t4g.micro"
  db_name              = "hearthstone"
  username             = "hearth_admin"
  password             = var.db_password
  skip_final_snapshot  = true
  vpc_security_group_ids = [aws_security_group.db_sg.id]
  db_subnet_group_name = module.vpc.database_subnet_group
}

# 3. ElastiCache (Redis)
resource "aws_elasticache_cluster" "hearth_redis" {
  cluster_id           = "hearthstone-redis"
  engine               = "redis"
  node_type            = "cache.t4g.micro"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  port                 = 6379
  subnet_group_name    = module.vpc.elasticache_subnet_group
}

# 4. ECS Cluster (App)
resource "aws_ecs_cluster" "hearth_cluster" {
  name = "hearthstone-cluster"
}
