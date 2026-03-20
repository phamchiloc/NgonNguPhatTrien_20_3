var express = require('express');
var router = express.Router();
let mongoose = require('mongoose');
let inventoryModel = require('../schemas/inventories');

function parseQuantity(input) {
  let quantity = Number(input);
  if (!Number.isFinite(quantity)) return null;
  if (quantity <= 0) return null;
  return quantity;
}

function isValidObjectId(id) {
  return mongoose.isValidObjectId(id);
}

const productPopulate = {
  path: 'product',
  select: 'title slug price description images category isDeleted',
};

// GET /api/v1/inventories
router.get('/', async function (req, res, next) {
  try {
    let data = await inventoryModel.find({}).populate(productPopulate);
    res.send(data);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

// GET /api/v1/inventories/:id (populate product)
router.get('/:id', async function (req, res, next) {
  try {
    let id = req.params.id;
    if (!isValidObjectId(id)) return res.status(400).send({ message: 'invalid id' });

    let result = await inventoryModel.findById(id).populate(productPopulate);
    if (!result) return res.status(404).send({ message: 'id not found' });

    res.send(result);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

// POST /api/v1/inventories/add_stock { product, quantity }
router.post('/add_stock', async function (req, res, next) {
  try {
    let product = req.body.product;
    let quantity = parseQuantity(req.body.quantity);

    if (!isValidObjectId(product)) return res.status(400).send({ message: 'invalid product' });
    if (quantity === null) return res.status(400).send({ message: 'invalid quantity' });

    let updated = await inventoryModel
      .findOneAndUpdate({ product }, { $inc: { stock: quantity } }, { new: true })
      .populate(productPopulate);

    if (!updated) return res.status(404).send({ message: 'inventory not found for product' });
    res.send(updated);
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

// POST /api/v1/inventories/remove_stock { product, quantity }
router.post('/remove_stock', async function (req, res, next) {
  try {
    let product = req.body.product;
    let quantity = parseQuantity(req.body.quantity);

    if (!isValidObjectId(product)) return res.status(400).send({ message: 'invalid product' });
    if (quantity === null) return res.status(400).send({ message: 'invalid quantity' });

    let exists = await inventoryModel.findOne({ product }).select('_id');
    if (!exists) return res.status(404).send({ message: 'inventory not found for product' });

    let updated = await inventoryModel
      .findOneAndUpdate(
        { product, stock: { $gte: quantity } },
        { $inc: { stock: -quantity } },
        { new: true }
      )
      .populate(productPopulate);

    if (!updated) return res.status(409).send({ message: 'insufficient stock' });
    res.send(updated);
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

// POST /api/v1/inventories/reservation { product, quantity }
// Decrease stock, increase reserved
router.post('/reservation', async function (req, res, next) {
  try {
    let product = req.body.product;
    let quantity = parseQuantity(req.body.quantity);

    if (!isValidObjectId(product)) return res.status(400).send({ message: 'invalid product' });
    if (quantity === null) return res.status(400).send({ message: 'invalid quantity' });

    let exists = await inventoryModel.findOne({ product }).select('_id');
    if (!exists) return res.status(404).send({ message: 'inventory not found for product' });

    let updated = await inventoryModel
      .findOneAndUpdate(
        { product, stock: { $gte: quantity } },
        { $inc: { stock: -quantity, reserved: quantity } },
        { new: true }
      )
      .populate(productPopulate);

    if (!updated) return res.status(409).send({ message: 'insufficient stock' });
    res.send(updated);
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

// POST /api/v1/inventories/sold { product, quantity }
// Decrease reserved, increase soldCount
router.post('/sold', async function (req, res, next) {
  try {
    let product = req.body.product;
    let quantity = parseQuantity(req.body.quantity);

    if (!isValidObjectId(product)) return res.status(400).send({ message: 'invalid product' });
    if (quantity === null) return res.status(400).send({ message: 'invalid quantity' });

    let exists = await inventoryModel.findOne({ product }).select('_id');
    if (!exists) return res.status(404).send({ message: 'inventory not found for product' });

    let updated = await inventoryModel
      .findOneAndUpdate(
        { product, reserved: { $gte: quantity } },
        { $inc: { reserved: -quantity, soldCount: quantity } },
        { new: true }
      )
      .populate(productPopulate);

    if (!updated) return res.status(409).send({ message: 'insufficient reserved' });
    res.send(updated);
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

module.exports = router;
