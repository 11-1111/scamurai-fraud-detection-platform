# Scamurai — Fraud Detection & Risk Analysis Platform

A full-stack fraud detection platform built using Vue 3, NestJS,
ASP.NET Core 8, SQL Server, Redis, Neo4j, and Docker.

## Overview

Scamurai is a distributed application for monitoring payment
transactions, evaluating fraud detection rules, calculating
transaction risk scores, and generating fraud alerts.

## Architecture

The platform consists of four applications:

| Application | Technology | Responsibility |
|---|---|---|
| Frontend | Vue 3 + TypeScript | Fraud monitoring dashboard |
| BFF | NestJS | API aggregation and integration |
| Fraud Engine | NestJS | Fraud detection and risk scoring |
| Transactions API | ASP.NET Core 8 | Transaction data access |

## Repository Structure

```text
apps/
  frontend/
  bff/
  fraud-engine/
  transactions-api/

infra/
  docker/
  database/
  apache/

docs/
  architecture/
  screenshots/

```
